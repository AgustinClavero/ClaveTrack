"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Cliente de Supabase para el navegador (solo auth; las mutaciones van por Server Actions). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
