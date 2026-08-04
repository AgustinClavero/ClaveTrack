// ============================================================
// Materialización del score diario en daily_scores.
// - upsertDayScore: escribe un DayScore ya calculado (lo usa getDashboard,
//   que ya tiene los datos del día en memoria).
// - materializeDayScore: recalcula el día desde la DB y lo persiste
//   (lo usan las Server Actions tras cada mutación).
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeDay,
  weightsFromSettings,
  xpForScore,
  type AreaKey,
  type AreaResult,
  type DayScore,
} from "@/lib/calculations/scoring";

/** Persiste un DayScore ya calculado. No escribe si el día no tiene datos. */
export async function upsertDayScore(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  score: DayScore,
  weights: Record<AreaKey, number>
) {
  if (score.activeAreas.length === 0) return;

  const breakdown: Record<string, number> = {};
  score.activeAreas.forEach((k) => (breakdown[k] = score.breakdown[k]));

  await supabase.from("daily_scores").upsert(
    {
      user_id: userId,
      log_date: date,
      total: score.total,
      breakdown,
      weights,
      xp: xpForScore(score.total),
    },
    { onConflict: "user_id,log_date" }
  );
}

/** Recalcula el score de un día desde la DB y lo materializa. */
export async function materializeDayScore(supabase: SupabaseClient, userId: string, date: string) {
  const [goalsRes, mealsRes, habitsRes, entriesRes, logRes, settingsRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g")
      .eq("user_id", userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase.from("meals").select("id, meal_items(kcal, protein_g)").eq("user_id", userId).eq("log_date", date),
    supabase.from("habits").select("id").eq("user_id", userId).eq("active", true),
    supabase.from("habit_entries").select("habit_id, done").eq("user_id", userId).eq("log_date", date),
    supabase.from("daily_logs").select("sleep_quality").eq("user_id", userId).eq("log_date", date).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const goals = goalsRes.data?.[0];
  const meals = mealsRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const entries = entriesRes.data ?? [];
  const log: any = logRes.data;

  // Totales del día (suma de snapshots de meal_items).
  let kcal = 0;
  let protein = 0;
  meals.forEach((m: any) =>
    (m.meal_items ?? []).forEach((it: any) => {
      kcal += Number(it.kcal);
      protein += Number(it.protein_g);
    })
  );

  const nutritionAdh = goals
    ? Math.round(
        (Math.min(100, (kcal / (goals.kcal || 1)) * 100) +
          Math.min(100, (protein / (goals.protein_g || 1)) * 100)) /
          2
      )
    : 0;

  const doneCount = entries.filter((e: any) => e.done).length;

  const areas: Partial<Record<AreaKey, AreaResult>> = {
    nutrition: { value: nutritionAdh, hasData: meals.length > 0 },
    habits: { value: habits.length ? (doneCount / habits.length) * 100 : 0, hasData: habits.length > 0 },
    rest: { value: (log?.sleep_quality ?? 0) * 10, hasData: log?.sleep_quality != null },
  };

  const weights = weightsFromSettings(settingsRes.data);
  const score = computeDay(areas, weights);
  await upsertDayScore(supabase, userId, date, score, weights);
  return score;
}
