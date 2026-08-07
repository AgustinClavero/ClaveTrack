// ============================================================
// Cliente de Strava. Solo servidor: acá viven el client_secret y los
// tokens del usuario, que nunca tienen que llegar al navegador.
// ============================================================

import type { WorkoutKind } from "@/lib/calculations/activity";

const API = "https://www.strava.com/api/v3";
const OAUTH = "https://www.strava.com/oauth";

/** Permisos mínimos: leer actividades, nada de escribir ni datos de perfil. */
export const STRAVA_SCOPE = "read,activity:read_all";

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  athleteId: number;
  athleteName: string | null;
  scope: string | null;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_heartrate?: number;
}

function credentials() {
  const id = process.env.STRAVA_CLIENT_ID;
  const secret = process.env.STRAVA_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

export const stravaConfigured = () => credentials() !== null;

export function authorizeUrl(redirectUri: string, state: string): string | null {
  const c = credentials();
  if (!c) return null;
  const q = new URLSearchParams({
    client_id: c.id,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  });
  return `${OAUTH}/authorize?${q}`;
}

function parseTokens(json: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: { id: number; firstname?: string; lastname?: string };
}): StravaTokens {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(json.expires_at * 1000),
    athleteId: json.athlete?.id ?? 0,
    athleteName: json.athlete ? [json.athlete.firstname, json.athlete.lastname].filter(Boolean).join(" ") || null : null,
    scope: json.scope ?? null,
  };
}

/** Canjea el código del callback por tokens. */
export async function exchangeCode(code: string): Promise<StravaTokens | null> {
  const c = credentials();
  if (!c) return null;
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: c.id, client_secret: c.secret, code, grant_type: "authorization_code" }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return parseTokens(await res.json());
}

/** Renueva el access token vencido. Strava puede rotar el refresh token. */
export async function refreshTokens(refreshToken: string): Promise<StravaTokens | null> {
  const c = credentials();
  if (!c) return null;
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: c.id,
      client_secret: c.secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return parseTokens(await res.json());
}

export async function getActivity(accessToken: string, id: number): Promise<StravaActivity | null> {
  const res = await fetch(`${API}/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as StravaActivity;
}

/** Últimas actividades, para la importación inicial al conectar. */
export async function recentActivities(accessToken: string, perPage = 30): Promise<StravaActivity[]> {
  const res = await fetch(`${API}/athlete/activities?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as StravaActivity[];
}

/**
 * Tipo de Strava → tipo nuestro. Lo que no reconocemos entra como "otro",
 * que tiene un MET conservador: mejor subestimar que inventar calorías.
 */
export function mapSportType(sport: string): WorkoutKind {
  const s = sport.toLowerCase();
  if (s.includes("walk") || s.includes("hike")) return "caminata";
  if (s.includes("run") || s.includes("trail")) return "running";
  if (s.includes("ride") || s.includes("bike") || s.includes("cycl")) return "ciclismo";
  if (s.includes("swim")) return "natacion";
  if (s.includes("soccer") || s.includes("football")) return "futbol";
  if (s.includes("box")) return "boxeo";
  if (s.includes("yoga") || s.includes("pilates")) return "yoga";
  if (s.includes("weight") || s.includes("workout") || s.includes("crossfit")) return "gimnasio";
  return "otro";
}

/**
 * Intensidad estimada por ritmo. Strava no la manda, y usar siempre
 * "moderada" haría que una caminata lenta y un trote valieran igual.
 */
export function guessIntensity(a: StravaActivity, kind: WorkoutKind): "suave" | "moderada" | "fuerte" {
  const minutes = a.moving_time / 60;
  if (minutes <= 0 || a.distance <= 0) return "moderada";
  const kmh = a.distance / 1000 / (minutes / 60);

  if (kind === "caminata") return kmh < 4 ? "suave" : kmh > 6 ? "fuerte" : "moderada";
  if (kind === "running") return kmh < 8 ? "suave" : kmh > 11 ? "fuerte" : "moderada";
  if (kind === "ciclismo") return kmh < 15 ? "suave" : kmh > 25 ? "fuerte" : "moderada";
  return "moderada";
}
