"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext, resolveDay } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { toggleHabitSchema, habitValueSchema, habitUpsertSchema, uuid } from "@/lib/validations";
import { sleepHabit } from "@/lib/data/nutrition-day";
import type { ActionResult } from "@/types";

function revalidateDay() {
  // Un hábito puede vivir en cualquiera de las tres páginas temáticas, y lo
  // cargado desde el "+" tiene que aparecer en la suya sin recargar a mano.
  revalidatePath("/today");
  revalidatePath("/nutrition");
  revalidatePath("/activity");
  revalidatePath("/routine");
  revalidatePath("/progress");
}

/** El hábito debe existir y ser del usuario (nunca confiar en el id del cliente). */
async function ownHabit(userId: string, habitId: string) {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("habits")
    .select("id, target_value")
    .eq("id", habitId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return data;
}

/** Marca/desmarca un hábito para HOY (fecha derivada en servidor). */
export async function toggleHabit(input: { habitId: string; done: boolean; date?: string }): Promise<ActionResult> {
  const parsed = toggleHabitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const habit = await ownHabit(ctx.userId, parsed.data.habitId);
  if (!habit) return { ok: false, error: "Ese hábito no existe." };
  const { date } = resolveDay(ctx.today, parsed.data.date);

  const supabase = getServerClient();
  const { error } = await supabase.from("habit_entries").upsert(
    { habit_id: habit.id, user_id: ctx.userId, log_date: date, done: parsed.data.done },
    { onConflict: "habit_id,log_date" }
  );
  if (error) return { ok: false, error: "No se pudo guardar. Probá de nuevo." };

  await materializeDayScore(supabase, ctx.userId, date);
  revalidateDay();
  return { ok: true, data: undefined };
}

/** Registra el valor numérico de un hábito (agua, pasos, sueño…) para HOY. */
export async function setHabitValue(input: { habitId: string; value: number; date?: string }): Promise<ActionResult<{ done: boolean }>> {
  const parsed = habitValueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Valor inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const habit = await ownHabit(ctx.userId, parsed.data.habitId);
  if (!habit) return { ok: false, error: "Ese hábito no existe." };

  const target = habit.target_value != null ? Number(habit.target_value) : null;
  const done = target != null ? parsed.data.value >= target : parsed.data.value > 0;
  const { date } = resolveDay(ctx.today, parsed.data.date);

  const supabase = getServerClient();
  const { error } = await supabase.from("habit_entries").upsert(
    { habit_id: habit.id, user_id: ctx.userId, log_date: date, done, value: parsed.data.value },
    { onConflict: "habit_id,log_date" }
  );
  if (error) return { ok: false, error: "No se pudo guardar. Probá de nuevo." };

  // Espejo del sueño en daily_logs: de ahí lo toma el índice de bienestar.
  const sleep = await sleepHabit(supabase, ctx.userId);
  if (sleep && sleep.id === habit.id) {
    await supabase
      .from("daily_logs")
      .upsert({ user_id: ctx.userId, log_date: date, sleep_h: parsed.data.value }, { onConflict: "user_id,log_date" });
  }

  await materializeDayScore(supabase, ctx.userId, date);
  revalidateDay();
  return { ok: true, data: { done } };
}

/** Crea o edita un hábito. */
export async function upsertHabit(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = habitUpsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del hábito." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const row = {
    user_id: ctx.userId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    target_value: parsed.data.targetValue ?? null,
    unit: parsed.data.unit ?? null,
    emoji: parsed.data.emoji ?? null,
    is_key: parsed.data.isKey ?? false,
    category: parsed.data.category ?? "routine",
    group_key: parsed.data.groupKey ?? null,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("habits").update(row).eq("id", parsed.data.id).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo actualizar el hábito." };
    revalidateDay();
    revalidatePath("/settings");
    return { ok: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("habits").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo crear el hábito." };
  revalidateDay();
  revalidatePath("/settings");
  return { ok: true, data: { id: data.id } };
}

/** Archiva un hábito (no borra su historial). */
export async function archiveHabit(input: { habitId: string }): Promise<ActionResult> {
  const parsed = uuid.safeParse(input?.habitId);
  if (!parsed.success) return { ok: false, error: "Hábito inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase
    .from("habits")
    .update({ active: false })
    .eq("id", parsed.data)
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo archivar el hábito." };

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateDay();
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
