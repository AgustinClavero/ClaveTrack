import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, getUser, getUserContext } from "@/lib/data/context";
import { exchangeCode, recentActivities, mapSportType } from "@/lib/strava";
import { saveStravaActivity } from "@/lib/data/strava-sync";
import { materializeDayScore } from "@/lib/data/score";

export const dynamic = "force-dynamic";

/** Cuántas actividades recientes se traen al conectar por primera vez. */
const IMPORT_LIMIT = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (estado: string) => NextResponse.redirect(new URL(`/settings?strava=${estado}`, request.url));

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // El usuario puede negar el permiso desde Strava.
  if (url.searchParams.get("error")) return back("cancelado");

  const state = url.searchParams.get("state");
  const saved = cookies().get("strava_state")?.value;
  cookies().delete("strava_state");
  if (!state || state !== saved) return back("estado-invalido");

  const code = url.searchParams.get("code");
  if (!code) return back("sin-codigo");

  const tokens = await exchangeCode(code);
  if (!tokens) return back("error");

  const supabase = getServerClient();
  const { error } = await supabase.from("strava_connections").upsert(
    {
      user_id: user.id,
      athlete_id: tokens.athleteId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt.toISOString(),
      scope: tokens.scope,
      athlete_name: tokens.athleteName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return back("error");

  // Importación inicial: sin esto la app queda vacía hasta la próxima salida.
  const ctx = await getUserContext();
  const activities = await recentActivities(tokens.accessToken, IMPORT_LIMIT);
  const dias = new Set<string>();
  for (const a of activities) {
    if (mapSportType(a.sport_type || a.type) === "otro") continue;
    const saved = await saveStravaActivity(supabase, user.id, a, ctx?.profile?.height_cm ? Number(ctx.profile.height_cm) : null);
    if (saved) dias.add(saved.date);
  }
  // El cumplimiento de cada día tocado se recalcula una sola vez.
  for (const d of dias) await materializeDayScore(supabase, user.id, d);

  return back(dias.size > 0 ? `ok-${dias.size}` : "ok");
}
