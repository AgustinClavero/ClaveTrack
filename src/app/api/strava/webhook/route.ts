import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActivity, mapSportType } from "@/lib/strava";
import { saveStravaActivity, validAccessToken } from "@/lib/data/strava-sync";
import { materializeDayScore } from "@/lib/data/score";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Webhook de Strava: avisa cuando el atleta termina, edita o borra una
 * actividad. Llega sin sesión, así que usa la clave de servicio; por eso
 * este archivo nunca debe importar nada del cliente.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

/** Verificación del endpoint: Strava lo llama una vez al darlo de alta. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (q.get("hub.mode") === "subscribe" && expected && q.get("hub.verify_token") === expected) {
    return NextResponse.json({ "hub.challenge": q.get("hub.challenge") });
  }
  return new NextResponse("forbidden", { status: 403 });
}

interface StravaEvent {
  object_type: string;
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
}

export async function POST(request: Request) {
  // Strava reintenta si no respondemos rápido: se acusa recibo siempre y
  // los problemas se resuelven de nuestro lado, no reintentando.
  const ok = () => NextResponse.json({ received: true });

  let event: StravaEvent;
  try {
    event = (await request.json()) as StravaEvent;
  } catch {
    return ok();
  }

  if (event.object_type !== "activity") return ok();

  const supabase = adminClient();
  if (!supabase) return ok();

  const { data: conn } = await supabase
    .from("strava_connections")
    .select("user_id")
    .eq("athlete_id", event.owner_id)
    .maybeSingle();
  if (!conn) return ok();

  const userId = conn.user_id;

  if (event.aspect_type === "delete") {
    const { data: gone } = await supabase
      .from("workouts")
      .select("log_date")
      .eq("user_id", userId)
      .eq("external_id", String(event.object_id))
      .maybeSingle();
    await supabase.from("workouts").delete().eq("user_id", userId).eq("external_id", String(event.object_id));
    if (gone) await materializeDayScore(supabase, userId, gone.log_date);
    return ok();
  }

  const token = await validAccessToken(supabase, userId);
  if (!token) return ok();

  const activity = await getActivity(token, event.object_id);
  if (!activity) return ok();
  // Lo que no sabemos mapear no entra: mejor sin dato que con uno inventado.
  if (mapSportType(activity.sport_type || activity.type) === "otro") return ok();

  const { data: profile } = await supabase.from("profiles").select("height_cm").eq("id", userId).maybeSingle();
  const saved = await saveStravaActivity(supabase, userId, activity, profile?.height_cm ? Number(profile.height_cm) : null);
  if (saved) await materializeDayScore(supabase, userId, saved.date);

  return ok();
}
