// ============================================================
// Agregados nutricionales de un día, tal como los necesita el
// Nutrition Score: no alcanza con kcal y proteína, hacen falta las
// decisiones (verduras, fruta, comida real, agua).
//
// Vive acá y no en cada pantalla para que la lectura y la
// materialización del score midan exactamente lo mismo.
// ============================================================

import type { ServerClient } from "@/lib/supabase/server";

export interface DayFoodFacts {
  kcal: number;
  protein: number;
  mealCount: number;
  vegetableServings: number;
  fruitServings: number;
  processedKcal: number;
  qualityScoreSum: number;
  qualityScoredKcal: number;
}

interface ItemRow {
  kcal: number | string;
  protein_g: number | string;
  food_id: string | null;
}

/** Resuelve categorías y marca de ultraprocesado de los ítems del día. */
export async function dayFoodFacts(supabase: ServerClient, userId: string, date: string): Promise<DayFoodFacts> {
  const { data: meals } = await supabase
    .from("meals")
    .select("id, meal_items(kcal, protein_g, food_id)")
    .eq("user_id", userId)
    .eq("log_date", date);

  const items: ItemRow[] = (meals ?? []).flatMap((m) => (m.meal_items ?? []) as ItemRow[]);
  const ids = [...new Set(items.map((i) => i.food_id).filter((x): x is string => !!x))];

  const foods = ids.length
    ? (await supabase.from("foods").select("id, category, is_processed, healthy_score").eq("user_id", userId).in("id", ids)).data ?? []
    : [];
  const byId = new Map(foods.map((f) => [f.id, f]));

  return items.reduce<DayFoodFacts>(
    (acc, it) => {
      const kcal = Number(it.kcal);
      acc.kcal += kcal;
      acc.protein += Number(it.protein_g);

      const f = it.food_id ? byId.get(it.food_id) : undefined;
      if (f?.category === "verduras") acc.vegetableServings += 1;
      if (f?.category === "frutas") acc.fruitServings += 1;
      if (f?.healthy_score != null) {
        acc.qualityScoreSum += f.healthy_score * kcal;
        acc.qualityScoredKcal += kcal;
      } else if (f?.is_processed) {
        acc.processedKcal += kcal;
      }
      return acc;
    },
    {
      kcal: 0,
      protein: 0,
      mealCount: (meals ?? []).length,
      vegetableServings: 0,
      fruitServings: 0,
      processedKcal: 0,
      qualityScoreSum: 0,
      qualityScoredKcal: 0,
    }
  );
}

/**
 * El hábito que mide el sueño, si el usuario lo tiene. Horas dormidas vive
 * en dos lugares (el check-in y la card de Rutina) y tienen que ser el mismo
 * dato: este helper es el que los une.
 */
export async function sleepHabit(supabase: ServerClient, userId: string) {
  const { data } = await supabase
    .from("habits")
    .select("id, name, unit, target_value")
    .eq("user_id", userId)
    .eq("active", true);
  return (data ?? []).find((h) => (h.unit ?? "").toLowerCase() === "h" && /dorm|sue/i.test(h.name)) ?? null;
}
