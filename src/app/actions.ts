"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  revalidatePath("/today");
  revalidatePath("/habits");
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
