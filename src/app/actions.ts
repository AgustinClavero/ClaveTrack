"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { materializeDayScore } from "@/lib/data/score";

/** Marca/desmarca un hábito para una fecha. */
export async function toggleHabit(habitId: string, date: string, done: boolean, value?: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("habit_entries")
    .upsert(
      { habit_id: habitId, user_id: user.id, log_date: date, done, value: value ?? null },
      { onConflict: "habit_id,log_date" }
    );

  if (!error) await materializeDayScore(supabase, user.id, date);

  revalidatePath("/today");
  revalidatePath("/habits");
  return { ok: !error, error: error?.message };
}

interface CheckinPayload {
  date: string;
  weightKg?: number | null;
  mood?: number;
  energy?: number;
  sleepQuality?: number;
  hunger?: number;
  focusNote?: string;
}

/** Guarda el check-in diario (daily_logs + peso). */
export async function saveCheckin(p: CheckinPayload) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: user.id,
      log_date: p.date,
      mood: p.mood ?? null,
      energy: p.energy ?? null,
      sleep_quality: p.sleepQuality ?? null,
      hunger: p.hunger ?? null,
      focus_note: p.focusNote ?? null,
      checkin_done_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" }
  );

  if (p.weightKg && p.weightKg > 0) {
    await supabase
      .from("body_entries")
      .upsert({ user_id: user.id, log_date: p.date, weight_kg: p.weightKg }, { onConflict: "user_id,log_date" });
  }

  // El check-in afecta el área Descanso (sleep_quality) → re-materializa el día.
  if (!error) await materializeDayScore(supabase, user.id, p.date);

  revalidatePath("/today");
  revalidatePath("/progress");
  return { ok: !error, error: error?.message };
}

/** Registra el peso del día. */
export async function saveWeight(kg: number, date: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("body_entries")
    .upsert({ user_id: user.id, log_date: date, weight_kg: kg }, { onConflict: "user_id,log_date" });

  revalidatePath("/progress");
  revalidatePath("/today");
  return { ok: !error, error: error?.message };
}
