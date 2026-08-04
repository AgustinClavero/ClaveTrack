"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { onboardingSchema, profileSchema, userSettingsSchema } from "@/lib/validations";
import { DEFAULT_FOODS } from "@/lib/data/default-foods";
import type { ActionResult } from "@/types";

/** Edita datos personales y de perfil. */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del perfil." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const p = parsed.data;

  const row: Record<string, unknown> = { id: ctx.userId };
  if (p.displayName !== undefined) row.display_name = p.displayName || null;
  if (p.timezone !== undefined) row.timezone = p.timezone;
  if (p.targetWeightKg !== undefined) row.target_weight_kg = p.targetWeightKg;
  if (p.sex !== undefined) row.sex = p.sex;
  if (p.birthYear !== undefined) row.birth_year = p.birthYear;
  if (p.heightCm !== undefined) row.height_cm = p.heightCm;
  if (p.activityLevel !== undefined) row.activity_level = p.activityLevel;

  const supabase = getServerClient();
  const { error } = await supabase.from("profiles").upsert(row as never, { onConflict: "id" });
  if (error) return { ok: false, error: "No se pudo guardar el perfil." };

  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/progress");
  return { ok: true, data: undefined };
}

/** Edita preferencias: umbral de racha, tema y pesos de las áreas del score. */
export async function updateUserSettings(input: unknown): Promise<ActionResult> {
  const parsed = userSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá las preferencias." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const s = parsed.data;

  const row: Record<string, unknown> = { user_id: ctx.userId };
  if (s.streakThreshold !== undefined) row.streak_threshold = s.streakThreshold;
  if (s.theme !== undefined) row.theme = s.theme;
  if (s.weights) {
    row.w_nutrition = s.weights.nutrition;
    row.w_tasks = s.weights.focus;
    row.w_activity = s.weights.activity;
    row.w_study = s.weights.study;
    row.w_habits = s.weights.habits;
    row.w_sleep = s.weights.rest;
  }

  const supabase = getServerClient();
  const { error } = await supabase.from("user_settings").upsert(row as never, { onConflict: "user_id" });
  if (error) return { ok: false, error: "No se pudieron guardar las preferencias." };

  // Los pesos cambian el score del día: re-materializar.
  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true, data: undefined };
}

/**
 * Onboarding completo en servidor: perfil + objetivos + hábitos + peso inicial
 * + catálogo base de alimentos. Idempotente (upserts): rehacerlo no duplica.
 */
export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Faltan datos o son inválidos. Revisá los pasos." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada. Iniciá sesión de nuevo." };
  const { profile, goals, habits } = parsed.data;
  const supabase = getServerClient();
  const today = ctx.today;

  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      id: ctx.userId,
      sex: profile.sex,
      birth_year: profile.birthYear,
      height_cm: profile.heightCm,
      activity_level: profile.activityLevel,
      target_weight_kg: profile.targetWeightKg,
      timezone: ctx.timezone,
    },
    { onConflict: "id" }
  );
  if (pErr) return { ok: false, error: "No se pudo guardar tu perfil." };

  const { error: gErr } = await supabase.from("nutrition_goals").upsert(
    {
      user_id: ctx.userId,
      effective_from: today,
      kcal: goals.kcal,
      protein_g: goals.proteinG,
      carbs_g: goals.carbsG,
      fat_g: goals.fatG,
      water_ml: goals.waterMl,
      mode: goals.mode,
      calc_inputs: goals.calcInputs ?? null,
      source: goals.mode === "auto" ? "ai" : "manual",
    },
    { onConflict: "user_id,effective_from" }
  );
  if (gErr) return { ok: false, error: "No se pudieron guardar tus objetivos nutricionales." };

  const { error: hErr } = await supabase.from("habits").upsert(
    habits.map((h, i) => ({
      user_id: ctx.userId,
      slug: h.slug,
      name: h.name,
      kind: h.kind,
      target_value: h.targetValue,
      unit: h.unit,
      emoji: h.emoji,
      is_key: h.isKey,
      display_order: i,
      active: true,
    })),
    { onConflict: "user_id,slug" }
  );
  if (hErr) return { ok: false, error: "No se pudieron guardar tus hábitos." };

  const { error: wErr } = await supabase
    .from("body_entries")
    .upsert({ user_id: ctx.userId, log_date: today, weight_kg: profile.weightKg }, { onConflict: "user_id,log_date" });
  if (wErr) return { ok: false, error: "No se pudo guardar tu peso inicial." };

  // Catálogo base de alimentos (solo si el usuario no tiene ninguno).
  const { count } = await supabase
    .from("foods")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId);
  if ((count ?? 0) === 0) {
    await supabase.from("foods").insert(
      DEFAULT_FOODS.map((f) => ({
        user_id: ctx.userId,
        name: f.name,
        base: f.base,
        kcal: f.kcal,
        protein_g: f.protein,
        carbs_g: f.carbs,
        fat_g: f.fat,
        fiber_g: f.fiber ?? 0,
      }))
    );
  }

  await materializeDayScore(supabase, ctx.userId, today);
  revalidatePath("/today");
  revalidatePath("/nutrition");
  revalidatePath("/habits");
  return { ok: true, data: undefined };
}
