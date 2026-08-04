"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { checkinSchema, weightSchema } from "@/lib/validations";
import type { ActionResult } from "@/types";

function revalidateDay() {
  revalidatePath("/today");
  revalidatePath("/progress");
  revalidatePath("/nutrition");
}

/** Guarda el check-in de HOY (fecha derivada en servidor, tz del perfil). */
export async function saveCheckin(input: unknown): Promise<ActionResult> {
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del check-in." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const p = parsed.data;

  const supabase = getServerClient();
  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: ctx.userId,
      log_date: ctx.today,
      mood: p.mood ?? null,
      energy: p.energy ?? null,
      sleep_quality: p.sleepQuality ?? null,
      hunger: p.hunger ?? null,
      focus_note: p.focusNote || null,
      checkin_done_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" }
  );
  if (error) return { ok: false, error: "No se pudo guardar el check-in." };

  if (p.weightKg != null && p.weightKg > 0) {
    const { error: wErr } = await supabase
      .from("body_entries")
      .upsert({ user_id: ctx.userId, log_date: ctx.today, weight_kg: p.weightKg }, { onConflict: "user_id,log_date" });
    if (wErr) return { ok: false, error: "Check-in guardado, pero el peso no se pudo registrar." };
  }

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateDay();
  return { ok: true, data: undefined };
}

/** Registra el peso de HOY. */
export async function saveWeight(input: { kg: number }): Promise<ActionResult> {
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "El peso debe estar entre 20 y 400 kg." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase
    .from("body_entries")
    .upsert({ user_id: ctx.userId, log_date: ctx.today, weight_kg: parsed.data.kg }, { onConflict: "user_id,log_date" });
  if (error) return { ok: false, error: "No se pudo registrar el peso." };

  revalidateDay();
  return { ok: true, data: undefined };
}

/** Suma agua al día (ml). Alimenta daily_logs.water_ml. */
export async function addWater(input: { ml: number }): Promise<ActionResult<{ waterMl: number }>> {
  const ml = Number(input?.ml);
  if (!Number.isFinite(ml) || ml < -2000 || ml > 2000 || ml === 0)
    return { ok: false, error: "Cantidad inválida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { data: log } = await supabase
    .from("daily_logs")
    .select("water_ml")
    .eq("user_id", ctx.userId)
    .eq("log_date", ctx.today)
    .maybeSingle();

  const next = Math.max(0, (log?.water_ml ?? 0) + ml);
  const { error } = await supabase
    .from("daily_logs")
    .upsert({ user_id: ctx.userId, log_date: ctx.today, water_ml: next }, { onConflict: "user_id,log_date" });
  if (error) return { ok: false, error: "No se pudo registrar el agua." };

  revalidateDay();
  return { ok: true, data: { waterMl: next } };
}
