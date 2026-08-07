// ============================================================
// Vuelca una actividad de Strava en una sesión nuestra.
//
// Dos decisiones que valen para todo el módulo:
//   - Las calorías las calculamos nosotros con METs y el peso del usuario,
//     igual que una sesión cargada a mano. Las de Strava salen de otro
//     modelo y mezclarlas daría totales incoherentes entre sesiones.
//   - Nada se duplica: la actividad se guarda con su id de Strava y el
//     índice único corta cualquier reenvío del webhook.
// ============================================================

import { burnedKcal, stepsToKm } from "@/lib/calculations/activity";
import { mapSportType, guessIntensity, refreshTokens, type StravaActivity } from "@/lib/strava";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Devuelve un access token vigente, renovándolo si hace falta. */
export async function validAccessToken(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("strava_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  // Un minuto de margen: no sirve un token que vence mientras lo usamos.
  if (new Date(data.expires_at).getTime() - 60_000 > Date.now()) return data.access_token;

  const fresh = await refreshTokens(data.refresh_token);
  if (!fresh) return null;

  await supabase
    .from("strava_connections")
    .update({
      access_token: fresh.accessToken,
      refresh_token: fresh.refreshToken,
      expires_at: fresh.expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return fresh.accessToken;
}

/** Último peso del usuario: base del cálculo de calorías. */
async function currentWeight(supabase: Client, userId: string): Promise<number> {
  const { data } = await supabase
    .from("body_entries")
    .select("weight_kg")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("log_date", { ascending: false })
    .limit(1);
  return data?.[0]?.weight_kg != null ? Number(data[0].weight_kg) : 0;
}

export interface SavedActivity {
  created: boolean;
  kind: string;
  minutes: number;
  kcal: number;
  date: string;
}

/**
 * Guarda la actividad. Si ya existe (mismo id de Strava) la actualiza en
 * lugar de crear otra: Strava reenvía eventos y también avisa ediciones.
 */
export async function saveStravaActivity(
  supabase: Client,
  userId: string,
  activity: StravaActivity,
  heightCm: number | null
): Promise<SavedActivity | null> {
  const kind = mapSportType(activity.sport_type || activity.type);
  const minutes = Math.max(1, Math.round(activity.moving_time / 60));
  const intensity = guessIntensity(activity, kind);
  const weightKg = await currentWeight(supabase, userId);
  const kcal = burnedKcal({ kind, minutes, intensity, weightKg });

  // start_date_local ya viene en la hora del usuario: el día sale de ahí.
  const date = activity.start_date_local.slice(0, 10);
  const distanceKm = activity.distance > 0 ? Math.round((activity.distance / 1000) * 100) / 100 : null;

  // Los pasos se estiman de la distancia solo cuando caminó o corrió.
  const steps =
    (kind === "caminata" || kind === "running") && distanceKm
      ? Math.round((distanceKm * 1000) / (stepsToKm(1, heightCm) * 1000))
      : null;

  const row = {
    user_id: userId,
    log_date: date,
    kind,
    minutes,
    intensity,
    distance_km: distanceKm,
    steps,
    kcal,
    note: activity.name || null,
    source: "strava",
    external_id: String(activity.id),
  };

  const { data: existing } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("external_id", String(activity.id))
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("workouts").update(row).eq("id", existing.id).eq("user_id", userId);
    if (error) return null;
    return { created: false, kind, minutes, kcal, date };
  }

  const { error } = await supabase.from("workouts").insert(row);
  if (error) return null;
  return { created: true, kind, minutes, kcal, date };
}
