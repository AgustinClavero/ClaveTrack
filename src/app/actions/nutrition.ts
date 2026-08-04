"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { foodCreateSchema, logMealSchema, nutritionGoalsSchema, uuid } from "@/lib/validations";
import { DEFAULT_FOODS } from "@/lib/data/default-foods";
import type { ActionResult } from "@/types";

function revalidateDay() {
  revalidatePath("/today");
  revalidatePath("/nutrition");
}

export interface FoodHit {
  id: string;
  name: string;
  base: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Busca alimentos del catálogo del usuario (para el picker de comidas). */
export async function searchFoods(query: string): Promise<ActionResult<FoodHit[]>> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const q = String(query ?? "").trim().slice(0, 60);

  const supabase = getServerClient();
  let req = supabase
    .from("foods")
    .select("id, name, base, kcal, protein_g, carbs_g, fat_g")
    .eq("user_id", ctx.userId)
    .order("name")
    .limit(20);
  if (q) req = req.ilike("name", `%${q}%`);

  const { data, error } = await req;
  if (error) return { ok: false, error: "No se pudo buscar." };
  return {
    ok: true,
    data: (data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      base: f.base,
      kcal: Number(f.kcal),
      proteinG: Number(f.protein_g),
      carbsG: Number(f.carbs_g),
      fatG: Number(f.fat_g),
    })),
  };
}

/** Alta de alimento propio. */
export async function createFood(input: unknown): Promise<ActionResult<FoodHit>> {
  const parsed = foodCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del alimento." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: ctx.userId,
      name: parsed.data.name,
      base: parsed.data.base,
      kcal: parsed.data.kcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
      fiber_g: parsed.data.fiberG ?? 0,
    })
    .select("id, name, base, kcal, protein_g, carbs_g, fat_g")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el alimento." };

  return {
    ok: true,
    data: {
      id: data.id,
      name: data.name,
      base: data.base,
      kcal: Number(data.kcal),
      proteinG: Number(data.protein_g),
      carbsG: Number(data.carbs_g),
      fatG: Number(data.fat_g),
    },
  };
}

/** Carga el catálogo base de alimentos (una vez; no duplica si ya hay). */
export async function seedDefaultFoods(): Promise<ActionResult<{ inserted: number }>> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();

  const { count } = await supabase
    .from("foods")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId);
  if ((count ?? 0) > 0) return { ok: true, data: { inserted: 0 } };

  const rows = DEFAULT_FOODS.map((f) => ({
    user_id: ctx.userId,
    name: f.name,
    base: f.base,
    kcal: f.kcal,
    protein_g: f.protein,
    carbs_g: f.carbs,
    fat_g: f.fat,
    fiber_g: f.fiber ?? 0,
  }));
  const { error } = await supabase.from("foods").insert(rows);
  if (error) return { ok: false, error: "No se pudo cargar el catálogo base." };
  return { ok: true, data: { inserted: rows.length } };
}

/**
 * Registra una comida de HOY con sus ítems.
 * El snapshot de macros se calcula EN SERVIDOR desde el catálogo
 * (regla de tres sobre la base del alimento) o del ítem manual validado.
 */
export async function logMeal(input: unknown): Promise<ActionResult> {
  const parsed = logMealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos de la comida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();

  // Resolver alimentos referenciados (solo los del usuario).
  const foodIds = parsed.data.items.filter((i) => i.kind === "food").map((i) => (i as { foodId: string }).foodId);
  const foodMap = new Map<string, { name: string; base: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }>();
  if (foodIds.length) {
    const { data: foods } = await supabase
      .from("foods")
      .select("id, name, base, kcal, protein_g, carbs_g, fat_g, fiber_g")
      .eq("user_id", ctx.userId)
      .in("id", foodIds);
    (foods ?? []).forEach((f) => foodMap.set(f.id, f));
    if (foodMap.size !== new Set(foodIds).size) return { ok: false, error: "Algún alimento ya no existe." };
  }

  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({
      user_id: ctx.userId,
      log_date: ctx.today,
      meal_type: parsed.data.mealType,
      eaten_at: new Date().toISOString(),
      note: parsed.data.note || null,
    })
    .select("id")
    .single();
  if (mealErr || !meal) return { ok: false, error: "No se pudo registrar la comida." };

  const BASE_QTY: Record<string, number> = { "100g": 100, "100ml": 100, unidad: 1 };
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const itemRows = parsed.data.items.map((it) => {
    if (it.kind === "food") {
      const f = foodMap.get(it.foodId)!;
      const factor = it.quantity / BASE_QTY[f.base];
      return {
        meal_id: meal.id,
        food_id: it.foodId,
        food_name: f.name,
        quantity: it.quantity,
        base: f.base,
        kcal: r1(Number(f.kcal) * factor),
        protein_g: r1(Number(f.protein_g) * factor),
        carbs_g: r1(Number(f.carbs_g) * factor),
        fat_g: r1(Number(f.fat_g) * factor),
        fiber_g: r1(Number(f.fiber_g) * factor),
      };
    }
    return {
      meal_id: meal.id,
      food_id: null,
      food_name: it.name,
      quantity: 1,
      base: "unidad",
      kcal: it.kcal,
      protein_g: it.proteinG,
      carbs_g: it.carbsG,
      fat_g: it.fatG,
      fiber_g: 0,
    };
  });

  const { error: itemsErr } = await supabase.from("meal_items").insert(itemRows);
  if (itemsErr) {
    // Sin ítems la comida no vale: rollback manual del padre.
    await supabase.from("meals").delete().eq("id", meal.id);
    return { ok: false, error: "No se pudieron guardar los alimentos de la comida." };
  }

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateDay();
  return { ok: true, data: undefined };
}

/** Borra una comida completa (con sus ítems, por cascade). */
export async function deleteMeal(input: { mealId: string }): Promise<ActionResult> {
  const parsed = uuid.safeParse(input?.mealId);
  if (!parsed.success) return { ok: false, error: "Comida inválida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase.from("meals").delete().eq("id", parsed.data).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo borrar la comida." };

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateDay();
  return { ok: true, data: undefined };
}

/** Publica una nueva versión de objetivos nutricionales (vigente desde hoy). */
export async function setNutritionGoals(input: unknown): Promise<ActionResult> {
  const parsed = nutritionGoalsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los objetivos." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const g = parsed.data;

  const supabase = getServerClient();
  const { error } = await supabase.from("nutrition_goals").upsert(
    {
      user_id: ctx.userId,
      effective_from: ctx.today,
      kcal: g.kcal,
      protein_g: g.proteinG,
      carbs_g: g.carbsG,
      fat_g: g.fatG,
      water_ml: g.waterMl,
      mode: g.mode,
      calc_inputs: g.calcInputs ?? null,
      source: g.mode === "auto" ? "ai" : "manual",
    },
    { onConflict: "user_id,effective_from" }
  );
  if (error) return { ok: false, error: "No se pudieron guardar los objetivos." };

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateDay();
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
