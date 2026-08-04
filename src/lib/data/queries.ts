import { createClient } from "@/lib/supabase/server";
import { dayTotals } from "@/lib/calculations/macros";
import type { Habit, Meal, MealType, NutritionGoals, WeightPoint } from "@/types";

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const MEAL_EMOJI: Record<string, string> = {
  desayuno: "🥣",
  almuerzo: "🍗",
  merienda: "🥜",
  cena: "🌙",
  colacion: "🍎",
  bebida: "🥤",
};

export interface Dashboard {
  onboarded: boolean;
  goals: NutritionGoals;
  meals: Meal[];
  habits: Habit[];
  weight: WeightPoint[];
  weightTarget: number;
  score: number;
  streak: number;
  date: string;
}

export async function getDashboard(): Promise<Dashboard | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const date = todayISO();

  const [goalsRes, mealsRes, habitsRes, entriesRes, weightRes, profileRes, doneDatesRes] = await Promise.all([
    supabase.from("nutrition_goals").select("*").eq("user_id", user.id).order("effective_from", { ascending: false }).limit(1),
    supabase.from("meals").select("*, meal_items(*)").eq("user_id", user.id).eq("log_date", date).order("created_at"),
    supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at"),
    supabase.from("habit_entries").select("habit_id, done, value").eq("user_id", user.id).eq("log_date", date),
    supabase.from("body_entries").select("log_date, weight_kg").eq("user_id", user.id).not("weight_kg", "is", null).order("log_date"),
    supabase.from("profiles").select("target_weight_kg").eq("id", user.id).maybeSingle(),
    supabase.from("habit_entries").select("log_date").eq("user_id", user.id).eq("done", true),
  ]);

  const goalRow = goalsRes.data?.[0];
  if (!goalRow) return { onboarded: false } as Dashboard;

  const goals: NutritionGoals = {
    kcal: goalRow.kcal,
    protein: goalRow.protein_g,
    carbs: goalRow.carbs_g,
    fat: goalRow.fat_g,
    waterMl: goalRow.water_ml,
  };

  const meals: Meal[] = (mealsRes.data ?? []).map((m: any) => ({
    id: m.id,
    type: m.meal_type as MealType,
    time: m.eaten_at ? new Date(m.eaten_at).toISOString().slice(11, 16) : undefined,
    planned: m.planned,
    emoji: MEAL_EMOJI[m.meal_type],
    items: (m.meal_items ?? []).map((it: any) => ({
      id: it.id,
      foodId: it.food_id,
      foodName: it.food_name,
      quantity: Number(it.quantity),
      base: it.base,
      macros: {
        kcal: Number(it.kcal),
        protein: Number(it.protein_g),
        carbs: Number(it.carbs_g),
        fat: Number(it.fat_g),
        fiber: Number(it.fiber_g),
      },
    })),
  }));

  const entryMap = new Map<string, { done: boolean; value: number | null }>();
  (entriesRes.data ?? []).forEach((e: any) => entryMap.set(e.habit_id, { done: e.done, value: e.value }));

  const habits: Habit[] = (habitsRes.data ?? []).map((h: any) => {
    const e = entryMap.get(h.id);
    const unit = h.unit ?? "";
    const meta = h.target_value != null ? `${e?.value ?? 0} / ${h.target_value} ${unit}`.trim() : "diario";
    return { id: h.id, name: h.name, kind: h.kind, meta, done: e?.done ?? false };
  });

  const weight: WeightPoint[] = (weightRes.data ?? []).map((w: any) => ({ date: w.log_date, kg: Number(w.weight_kg) }));
  const weightTarget = profileRes.data?.target_weight_kg ?? (weight.length ? weight[weight.length - 1].kg : 80);

  // Cumplimiento simplificado (nutrición + hábitos). Se afinará con actividad/estudio/sueño.
  const totals = dayTotals(meals);
  const nutritionScore = goals.kcal ? Math.min(100, Math.round((totals.kcal / goals.kcal) * 100)) : 0;
  const habitsScore = habits.length ? Math.round((habits.filter((h) => h.done).length / habits.length) * 100) : 0;
  const score = Math.round(nutritionScore * 0.5 + habitsScore * 0.5);

  const streak = computeStreak((doneDatesRes.data ?? []).map((r: any) => r.log_date), date);

  return { onboarded: true, goals, meals, habits, weight, weightTarget, score, streak, date };
}

/** Racha ligera para el encabezado (sin traer todo el dashboard). */
export async function getStreak(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase.from("habit_entries").select("log_date").eq("user_id", user.id).eq("done", true);
  return computeStreak((data ?? []).map((r: any) => r.log_date), todayISO());
}

function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date(today + "T00:00:00");
  // Permite que la racha "arranque" hoy o ayer.
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
