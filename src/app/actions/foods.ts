"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { foodCreateSchema, logRecipeSchema, recipeSchema, toggleFavoriteSchema, uuid } from "@/lib/validations";
import { DEFAULT_FOODS, type FoodCategory } from "@/lib/data/default-foods";
import type { ActionResult } from "@/types";

export interface FoodHit {
  id: string;
  name: string;
  base: string;
  category: FoodCategory;
  brand: string | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  unitLabel: string | null;
  unitGrams: number | null;
  state: "crudo" | "cocido" | null;
  isFavorite: boolean;
}

const FOOD_COLS =
  "id, name, base, category, brand, kcal, protein_g, carbs_g, fat_g, unit_label, unit_grams, state, is_favorite";

type FoodRow = {
  id: string;
  name: string;
  base: string;
  category: string;
  brand: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  unit_label: string | null;
  unit_grams: number | null;
  state: string | null;
  is_favorite: boolean;
};

function mapFood(f: FoodRow): FoodHit {
  return {
    id: f.id,
    name: f.name,
    base: f.base,
    category: (f.category ?? "otros") as FoodCategory,
    brand: f.brand,
    kcal: Number(f.kcal),
    proteinG: Number(f.protein_g),
    carbsG: Number(f.carbs_g),
    fatG: Number(f.fat_g),
    unitLabel: f.unit_label,
    unitGrams: f.unit_grams != null ? Number(f.unit_grams) : null,
    state: (f.state as "crudo" | "cocido" | null) ?? null,
    isFavorite: f.is_favorite,
  };
}

export interface FoodPickerData {
  favorites: FoodHit[];
  recent: FoodHit[];
  recipes: RecipeHit[];
}

export interface RecipeHit {
  id: string;
  name: string;
  emoji: string | null;
  servings: number;
  kcal: number;
  proteinG: number;
  items: string[];
}

/** Lo que se muestra al abrir el buscador: recetas, favoritos y recientes. */
export async function getFoodPickerData(): Promise<ActionResult<FoodPickerData>> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();

  const [favRes, recentRes, recipesRes] = await Promise.all([
    supabase.from("foods").select(FOOD_COLS).eq("user_id", ctx.userId).eq("is_favorite", true).order("name").limit(24),
    // Recientes: últimos alimentos usados en comidas propias.
    supabase
      .from("meal_items")
      .select("food_id, created_at, meals!inner(user_id)")
      .eq("meals.user_id", ctx.userId)
      .not("food_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("recipes")
      .select("id, name, emoji, servings, recipe_items(food_name, kcal, protein_g)")
      .eq("user_id", ctx.userId)
      .order("is_favorite", { ascending: false })
      .order("name")
      .limit(20),
  ]);

  // Dedup preservando el orden de uso.
  const seen = new Set<string>();
  const recentIds: string[] = [];
  (recentRes.data ?? []).forEach((r) => {
    if (r.food_id && !seen.has(r.food_id)) {
      seen.add(r.food_id);
      recentIds.push(r.food_id);
    }
  });

  let recent: FoodHit[] = [];
  if (recentIds.length) {
    const { data } = await supabase
      .from("foods")
      .select(FOOD_COLS)
      .eq("user_id", ctx.userId)
      .in("id", recentIds.slice(0, 12));
    const byId = new Map((data ?? []).map((f) => [f.id, mapFood(f as FoodRow)]));
    recent = recentIds.map((id) => byId.get(id)).filter((f): f is FoodHit => !!f);
  }

  const recipes: RecipeHit[] = (recipesRes.data ?? []).map((r) => {
    const items = (r.recipe_items ?? []) as { food_name: string; kcal: number; protein_g: number }[];
    const servings = Number(r.servings) || 1;
    return {
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      servings,
      kcal: Math.round(items.reduce((s, i) => s + Number(i.kcal), 0) / servings),
      proteinG: Math.round(items.reduce((s, i) => s + Number(i.protein_g), 0) / servings),
      items: items.map((i) => i.food_name),
    };
  });

  return {
    ok: true,
    data: { favorites: (favRes.data ?? []).map((f) => mapFood(f as FoodRow)), recent, recipes },
  };
}

/** Busca en el catálogo del usuario. Sin texto devuelve los primeros por categoría. */
export async function searchFoods(query: string, category?: string): Promise<ActionResult<FoodHit[]>> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const q = String(query ?? "").trim().slice(0, 60);

  const supabase = getServerClient();
  let req = supabase
    .from("foods")
    .select(FOOD_COLS)
    .eq("user_id", ctx.userId)
    .order("is_favorite", { ascending: false })
    .order("name")
    .limit(40);
  if (q) req = req.ilike("name", `%${q}%`);
  if (category) req = req.eq("category", category);

  const { data, error } = await req;
  if (error) return { ok: false, error: "No se pudo buscar." };
  return { ok: true, data: (data ?? []).map((f) => mapFood(f as FoodRow)) };
}

export async function toggleFoodFavorite(input: unknown): Promise<ActionResult> {
  const parsed = toggleFavoriteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Alimento inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase
    .from("foods")
    .update({ is_favorite: parsed.data.favorite })
    .eq("id", parsed.data.foodId)
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo actualizar el favorito." };
  return { ok: true, data: undefined };
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
      category: parsed.data.category ?? "otros",
      brand: parsed.data.brand ?? null,
      kcal: parsed.data.kcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
      fiber_g: parsed.data.fiberG ?? 0,
      unit_label: parsed.data.unitLabel ?? null,
      unit_grams: parsed.data.unitGrams ?? null,
      state: parsed.data.state ?? null,
    })
    .select(FOOD_COLS)
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el alimento." };
  return { ok: true, data: mapFood(data as FoodRow) };
}

/** Carga el catálogo base. Idempotente por nombre + estado. */
export async function seedDefaultFoods(): Promise<ActionResult<{ inserted: number }>> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();

  const { data: existing } = await supabase.from("foods").select("name, state").eq("user_id", ctx.userId);
  const have = new Set((existing ?? []).map((f) => `${f.name}|${f.state ?? ""}`));

  const rows = DEFAULT_FOODS.filter((f) => !have.has(`${f.name}|${f.state ?? ""}`)).map((f) => ({
    user_id: ctx.userId,
    name: f.name,
    base: f.base,
    category: f.category,
    kcal: f.kcal,
    protein_g: f.protein,
    carbs_g: f.carbs,
    fat_g: f.fat,
    fiber_g: f.fiber ?? 0,
    unit_label: f.unitLabel ?? null,
    unit_grams: f.unitGrams ?? null,
    state: f.state ?? null,
    is_favorite: f.favorite ?? false,
  }));
  if (rows.length === 0) return { ok: true, data: { inserted: 0 } };

  const { error } = await supabase.from("foods").insert(rows);
  if (error) return { ok: false, error: "No se pudo cargar el catálogo." };
  revalidatePath("/nutrition");
  return { ok: true, data: { inserted: rows.length } };
}

// ============================================================
// Recetas
// ============================================================

/** Crea una receta a partir de alimentos del catálogo, con snapshot de macros. */
export async function saveRecipe(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos de la receta." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();

  const ids = parsed.data.items.map((i) => i.foodId);
  const { data: foods } = await supabase.from("foods").select(FOOD_COLS).eq("user_id", ctx.userId).in("id", ids);
  const byId = new Map((foods ?? []).map((f) => [f.id, mapFood(f as FoodRow)]));
  if (byId.size !== new Set(ids).size) return { ok: false, error: "Algún alimento ya no existe." };

  const row = {
    user_id: ctx.userId,
    name: parsed.data.name,
    emoji: parsed.data.emoji ?? null,
    servings: parsed.data.servings ?? 1,
  };

  let recipeId = parsed.data.id;
  if (recipeId) {
    const { error } = await supabase.from("recipes").update(row).eq("id", recipeId).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo actualizar la receta." };
    await supabase.from("recipe_items").delete().eq("recipe_id", recipeId);
  } else {
    const { data, error } = await supabase.from("recipes").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: "No se pudo crear la receta." };
    recipeId = data.id;
  }

  const r1 = (n: number) => Math.round(n * 10) / 10;
  const items = parsed.data.items.map((i) => {
    const f = byId.get(i.foodId)!;
    const factor = i.quantity / 100;
    return {
      recipe_id: recipeId!,
      food_id: i.foodId,
      food_name: f.name,
      quantity: i.quantity,
      base: f.base,
      kcal: r1(f.kcal * factor),
      protein_g: r1(f.proteinG * factor),
      carbs_g: r1(f.carbsG * factor),
      fat_g: r1(f.fatG * factor),
    };
  });
  const { error: itErr } = await supabase.from("recipe_items").insert(items);
  if (itErr) return { ok: false, error: "No se pudieron guardar los ingredientes." };

  revalidatePath("/nutrition");
  return { ok: true, data: { id: recipeId! } };
}

/** Registra una receta completa como comida del día: un solo toque. */
export async function logRecipe(input: unknown): Promise<ActionResult> {
  const parsed = logRecipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const supabase = getServerClient();
  const portions = parsed.data.servings ?? 1;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, servings, recipe_items(*)")
    .eq("id", parsed.data.recipeId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!recipe) return { ok: false, error: "Esa receta no existe." };

  const items = (recipe.recipe_items ?? []) as {
    food_id: string | null;
    food_name: string;
    quantity: number;
    base: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }[];
  if (items.length === 0) return { ok: false, error: "La receta no tiene ingredientes." };

  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({
      user_id: ctx.userId,
      log_date: ctx.today,
      meal_type: parsed.data.mealType,
      eaten_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (mealErr || !meal) return { ok: false, error: "No se pudo registrar la comida." };

  // La receta rinde N porciones: se escala a las que se comieron.
  const scale = portions / (Number(recipe.servings) || 1);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const { error } = await supabase.from("meal_items").insert(
    items.map((i) => ({
      meal_id: meal.id,
      food_id: i.food_id,
      food_name: i.food_name,
      quantity: r1(Number(i.quantity) * scale),
      base: i.base,
      kcal: r1(Number(i.kcal) * scale),
      protein_g: r1(Number(i.protein_g) * scale),
      carbs_g: r1(Number(i.carbs_g) * scale),
      fat_g: r1(Number(i.fat_g) * scale),
      fiber_g: 0,
    }))
  );
  if (error) {
    await supabase.from("meals").delete().eq("id", meal.id);
    return { ok: false, error: "No se pudieron guardar los ingredientes." };
  }

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidatePath("/nutrition");
  revalidatePath("/today");
  return { ok: true, data: undefined };
}
