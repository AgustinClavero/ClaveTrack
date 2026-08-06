// ============================================================
// Materialización del score diario en daily_scores.
// - upsertDayScore: escribe un DayScore ya calculado.
// - materializeDayScore: recalcula el día desde la DB y lo persiste
//   (lo usan las Server Actions tras cada mutación).
// El cálculo de áreas vive en computeAreasForDay (scoring.ts):
// misma lógica para pantalla y persistencia, sin divergencias.
// ============================================================

import {
  computeAreasForDay,
  computeDay,
  weightsFromSettings,
  xpForScore,
  type AreaKey,
  type DayScore,
} from "@/lib/calculations/scoring";
import type { ServerClient } from "@/lib/supabase/server";
import { dayFoodFacts } from "./nutrition-day";

/** Persiste un DayScore ya calculado. No escribe si el día no tiene datos. */
export async function upsertDayScore(
  supabase: ServerClient,
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
export async function materializeDayScore(supabase: ServerClient, userId: string, date: string) {
  const [goalsRes, facts, habitsRes, entriesRes, logRes, settingsRes, tasksRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, water_ml")
      .eq("user_id", userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    dayFoodFacts(supabase, userId, date),
    supabase.from("habits").select("id").eq("user_id", userId).eq("active", true),
    supabase.from("habit_entries").select("habit_id, done").eq("user_id", userId).eq("log_date", date),
    supabase.from("daily_logs").select("sleep_quality, water_ml").eq("user_id", userId).eq("log_date", date).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    // Tareas del día o vencidas: lo que estaba planificado para hoy.
    supabase.from("tasks").select("status, due_date").eq("user_id", userId).lte("due_date", date),
  ]);

  const goalRow = goalsRes.data?.[0] ?? null;
  const activeHabits = habitsRes.data ?? [];
  const entryByHabit = new Map((entriesRes.data ?? []).map((e) => [e.habit_id, e.done ?? false]));

  const areas = computeAreasForDay({
    totals: { kcal: facts.kcal, protein: facts.protein },
    mealCount: facts.mealCount,
    goals: goalRow ? { kcal: goalRow.kcal, protein: goalRow.protein_g } : null,
    waterL: (logRes.data?.water_ml ?? 0) / 1000,
    waterGoalL: (goalRow?.water_ml ?? 0) / 1000,
    vegetableServings: facts.vegetableServings,
    fruitServings: facts.fruitServings,
    processedKcal: facts.processedKcal,
    qualityScoreSum: facts.qualityScoreSum,
    qualityScoredKcal: facts.qualityScoredKcal,
    // Solo hábitos ACTIVOS: los archivados no puntúan aunque tengan entry.
    habits: activeHabits.map((h) => ({ done: entryByHabit.get(h.id) ?? false })),
    sleepQuality: logRes.data?.sleep_quality ?? null,
    tasks: (tasksRes.data ?? []).map((t) => ({ status: t.status as "pendiente" | "haciendo" | "hecha", dueDate: t.due_date })),
    today: date,
  });

  const weights = weightsFromSettings(settingsRes.data ?? undefined);
  const score = computeDay(areas, weights);
  await upsertDayScore(supabase, userId, date, score, weights);
  return score;
}
