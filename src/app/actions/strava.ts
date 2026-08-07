"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { saveStravaActivity, validAccessToken } from "@/lib/data/strava-sync";
import { recentActivities, mapSportType } from "@/lib/strava";
import type { ActionResult } from "@/types";

/** Sincronización manual, para cuando el webhook no llegó o recién se conectó. */
export async function syncStrava(): Promise<ActionResult<{ imported: number }>> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const token = await validAccessToken(supabase, ctx.userId);
  if (!token) return { ok: false, error: "Volvé a conectar tu cuenta de Strava." };

  const activities = await recentActivities(token, 30);
  const dias = new Set<string>();
  let imported = 0;

  for (const a of activities) {
    if (mapSportType(a.sport_type || a.type) === "otro") continue;
    const saved = await saveStravaActivity(
      supabase,
      ctx.userId,
      a,
      ctx.profile?.height_cm ? Number(ctx.profile.height_cm) : null
    );
    if (saved) {
      imported++;
      dias.add(saved.date);
    }
  }
  for (const d of dias) await materializeDayScore(supabase, ctx.userId, d);

  revalidatePath("/activity");
  revalidatePath("/today");
  revalidatePath("/settings");
  return { ok: true, data: { imported } };
}

/**
 * Corta la conexión. Las sesiones ya importadas quedan: son datos del
 * usuario, no de Strava, y borrarlas sería una sorpresa desagradable.
 */
export async function disconnectStrava(): Promise<ActionResult> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase.from("strava_connections").delete().eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo desconectar." };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
