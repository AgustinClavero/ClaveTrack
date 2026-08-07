import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getUser } from "@/lib/data/context";
import { authorizeUrl, stravaConfigured } from "@/lib/strava";

export const dynamic = "force-dynamic";

/** Arranca el OAuth de Strava. Requiere sesión: la cuenta se ata a este usuario. */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!stravaConfigured()) return NextResponse.redirect(new URL("/settings?strava=sin-config", request.url));

  // `state` contra CSRF: se guarda en cookie y se compara al volver, para
  // que nadie pueda enganchar una cuenta de Strava ajena a esta sesión.
  const state = randomUUID();
  cookies().set("strava_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = new URL("/api/strava/callback", request.url).toString();
  const url = authorizeUrl(redirectUri, state);
  if (!url) return NextResponse.redirect(new URL("/settings?strava=sin-config", request.url));
  return NextResponse.redirect(url);
}
