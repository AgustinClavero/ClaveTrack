"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { logMealSchema, nutritionGoalsSchema, updateMealSchema, uuid } from "@/lib/validations";
import type { ActionResult } from "@/types";
import type { TablesUpdate } from "@/types/database";

function revalidateDay() {
  revalidatePath("/today");
  revalidatePath("/nutrition");
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

  // La foto debe vivir en la carpeta del propio usuario.
  const photoPath = parsed.data.photoPath?.startsWith(`${ctx.userId}/`) ? parsed.data.photoPath : null;

  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({
      user_id: ctx.userId,
      log_date: ctx.today,
      meal_type: parsed.data.mealType,
      eaten_at: new Date().toISOString(),
      note: parsed.data.note || null,
      photo_path: photoPath,
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

/**
 * Edita una comida: nota, foto y multiplicador de porciones.
 * `servings` reescala los macros snapshot de todos los ítems.
 */
export async function updateMeal(input: unknown): Promise<ActionResult> {
  const parsed = updateMealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();
  const { mealId, note, photoPath, servings } = parsed.data;

  const { data: meal } = await supabase
    .from("meals")
    .select("id, log_date")
    .eq("id", mealId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!meal) return { ok: false, error: "Esa comida no existe." };

  const patch: TablesUpdate<"meals"> = {};
  if (note !== undefined) patch.note = note;
  if (photoPath !== undefined) {
    patch.photo_path = photoPath?.startsWith(`${ctx.userId}/`) ? photoPath : null;
  }
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("meals").update(patch).eq("id", mealId).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo actualizar la comida." };
  }

  if (servings != null && servings !== 1) {
    const { data: items } = await supabase
      .from("meal_items")
      .select("id, quantity, kcal, protein_g, carbs_g, fat_g, fiber_g")
      .eq("meal_id", mealId);
    const r1 = (n: number) => Math.round(n * 10) / 10;
    for (const it of items ?? []) {
      await supabase
        .from("meal_items")
        .update({
          quantity: r1(Number(it.quantity) * servings),
          kcal: r1(Number(it.kcal) * servings),
          protein_g: r1(Number(it.protein_g) * servings),
          carbs_g: r1(Number(it.carbs_g) * servings),
          fat_g: r1(Number(it.fat_g) * servings),
          fiber_g: r1(Number(it.fiber_g) * servings),
        })
        .eq("id", it.id);
    }
  }

  await materializeDayScore(supabase, ctx.userId, meal.log_date);
  revalidateDay();
  revalidatePath(`/nutrition/${mealId}`);
  return { ok: true, data: undefined };
}

/** Quita un ítem de una comida. */
export async function deleteMealItem(input: { itemId: string }): Promise<ActionResult> {
  const parsed = uuid.safeParse(input?.itemId);
  if (!parsed.success) return { ok: false, error: "Ítem inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();

  // Verifica pertenencia a través de la comida padre.
  const { data: item } = await supabase
    .from("meal_items")
    .select("id, meal_id, meals!inner(user_id, log_date)")
    .eq("id", parsed.data)
    .maybeSingle();
  const parent = item?.meals as unknown as { user_id: string; log_date: string } | undefined;
  if (!item || parent?.user_id !== ctx.userId) return { ok: false, error: "Ese ítem no existe." };

  const { error } = await supabase.from("meal_items").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: "No se pudo quitar el alimento." };

  await materializeDayScore(supabase, ctx.userId, parent.log_date);
  revalidateDay();
  revalidatePath(`/nutrition/${item.meal_id}`);
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
