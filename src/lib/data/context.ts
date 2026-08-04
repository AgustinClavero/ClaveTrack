// ============================================================
// Contexto del usuario por request, memoizado con React cache():
// una sola validación de sesión y una sola lectura de perfil+ajustes
// por render, compartida entre layout, páginas y componentes.
// ============================================================

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { userToday, DEFAULT_TZ } from "@/lib/date";
import { weightsFromSettings, DEFAULT_STREAK_THRESHOLD, type AreaKey } from "@/lib/calculations/scoring";
import type { Tables } from "@/types/database";

/** Cliente Supabase del request (memoizado). */
export const getServerClient = cache(() => createClient());

/** Usuario autenticado (1 solo round-trip a Auth por request). */
export const getUser = cache(async () => {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface UserContext {
  userId: string;
  timezone: string;
  /** "Hoy" en la timezone del usuario (YYYY-MM-DD). Única fuente del día. */
  today: string;
  profile: Tables<"profiles"> | null;
  settings: Tables<"user_settings"> | null;
  weights: Record<AreaKey, number>;
  streakThreshold: number;
}

/** Perfil + ajustes + "hoy" del usuario. null = sin sesión. */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = getServerClient();

  const [profileRes, settingsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = profileRes.data ?? null;
  const settings = settingsRes.data ?? null;
  const timezone = profile?.timezone ?? DEFAULT_TZ;

  return {
    userId: user.id,
    timezone,
    today: userToday(timezone),
    profile,
    settings,
    weights: weightsFromSettings(settings ?? undefined),
    streakThreshold: settings?.streak_threshold ?? DEFAULT_STREAK_THRESHOLD,
  };
});
