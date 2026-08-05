"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext, resolveDay } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { workoutSchema, uuid } from "@/lib/validations";
import { burnedKcal, stepsToKm, type WorkoutKind } from "@/lib/calculations/activity";
import type { ActionResult } from "@/types";

function revalidateDay() {
  revalidatePath("/activity");
  revalidatePath("/today");
  revalidatePath("/progress");
}

/** Último peso registrado: base del cálculo de calorías. */
async function currentWeight(userId: string): Promise<number> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("body_entries")
    .select("weight_kg")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("log_date", { ascending: false })
    .limit(1);
  return data?.[0]?.weight_kg != null ? Number(data[0].weight_kg) : 0;
}

/**
 * Registra una sesión de actividad. Las calorías se estiman EN SERVIDOR
 * con METs y el peso del usuario; el cliente no las manda.
 */
export async function logWorkout(input: unknown): Promise<ActionResult<{ kcal: number }>> {
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos de la sesión." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const w = parsed.data;
  const { date } = resolveDay(ctx.today, w.date);

  const weightKg = await currentWeight(ctx.userId);
  const kcal = burnedKcal({ kind: w.kind as WorkoutKind, minutes: w.minutes, intensity: w.intensity, weightKg });

  // Si hay pasos y no se cargó distancia, se deriva de la altura.
  const distance =
    w.distanceKm ?? (w.steps ? Math.round(stepsToKm(w.steps, ctx.profile?.height_cm ? Number(ctx.profile.height_cm) : null) * 100) / 100 : null);

  const supabase = getServerClient();
  const { error } = await supabase.from("workouts").insert({
    user_id: ctx.userId,
    log_date: date,
    kind: w.kind,
    minutes: w.minutes,
    intensity: w.intensity,
    distance_km: distance,
    steps: w.steps ?? null,
    kcal,
    note: w.note || null,
  });
  if (error) return { ok: false, error: "No se pudo registrar la sesión." };

  // Los pasos alimentan el hábito de caminar si existe.
  // Se busca por unidad "pasos" y no por slug: los hábitos creados antes de
  // que existiera la columna slug lo tienen en null.
  if (w.steps && w.steps > 0) {
    const { data: habits } = await supabase
      .from("habits")
      .select("id, target_value, slug, unit, name")
      .eq("user_id", ctx.userId)
      .eq("active", true);
    const habit = (habits ?? []).find(
      (h) => h.slug === "caminar" || h.unit?.toLowerCase() === "pasos" || /camin/i.test(h.name)
    );
    if (habit) {
      const { data: entry } = await supabase
        .from("habit_entries")
        .select("value")
        .eq("habit_id", habit.id)
        .eq("log_date", date)
        .maybeSingle();
      const next = Number(entry?.value ?? 0) + w.steps;
      await supabase.from("habit_entries").upsert(
        {
          habit_id: habit.id,
          user_id: ctx.userId,
          log_date: date,
          value: next,
          done: habit.target_value != null ? next >= Number(habit.target_value) : next > 0,
        },
        { onConflict: "habit_id,log_date" }
      );
    }
  }

  await materializeDayScore(supabase, ctx.userId, date);
  revalidateDay();
  return { ok: true, data: { kcal } };
}

export async function deleteWorkout(input: { workoutId: string }): Promise<ActionResult> {
  const parsed = uuid.safeParse(input?.workoutId);
  if (!parsed.success) return { ok: false, error: "Sesión inválida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase.from("workouts").delete().eq("id", parsed.data).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo borrar la sesión." };

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateDay();
  return { ok: true, data: undefined };
}
