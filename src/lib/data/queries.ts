import { createClient } from "@/lib/supabase/server";
import { dayTotals } from "@/lib/calculations/macros";
import {
  computeDay,
  DEFAULT_STREAK_THRESHOLD,
  levelFromXp,
  scoreLabel,
  weightsFromSettings,
  xpForScore,
  type AreaKey,
  type AreaResult,
  type DayScore,
} from "@/lib/calculations/scoring";
import { upsertDayScore } from "@/lib/data/score";
import { userToday, recentDays, DEFAULT_TZ, type DayCell } from "@/lib/date";
import type { Habit, Meal, MealType, NutritionGoals, WeightPoint } from "@/types";

const MEAL_EMOJI: Record<string, string> = {
  desayuno: "🥣",
  almuerzo: "🍗",
  merienda: "🥜",
  cena: "🌙",
  colacion: "🍎",
  bebida: "🥤",
};

export interface KeyHabit {
  id: string;
  name: string;
  emoji: string;
  value: number;
  target: number;
  unit: string;
  pct: number;
}

export interface CalendarDay extends DayCell {
  score: number | null; // null = sin datos
}

export interface Checkin {
  done: boolean;
  focusNote: string | null;
  weightKg: number | null;
}

export interface Dashboard {
  onboarded: boolean;
  date: string;
  timezone: string;
  goals: NutritionGoals;
  meals: Meal[];
  totals: ReturnType<typeof dayTotals>;
  habits: Habit[];
  keyHabits: KeyHabit[];
  weight: WeightPoint[];
  weightTarget: number;
  streak: number;
  score: DayScore;
  label: string;
  level: { level: number; inLevel: number; per: number };
  calendar: CalendarDay[];
  checkin: Checkin;
}

const HABIT_ICON: Record<string, string> = {
  agua: "💧",
  caminar: "👟",
  pasos: "👟",
  dormir: "😴",
  sueño: "😴",
  leer: "📚",
  entrenar: "🏋️",
};

function iconFor(name: string): string {
  const n = name.toLowerCase();
  for (const k of Object.keys(HABIT_ICON)) if (n.includes(k)) return HABIT_ICON[k];
  return "✓";
}

export async function getDashboard(): Promise<Dashboard | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_weight_kg, timezone")
    .eq("id", user.id)
    .maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TZ;
  const date = userToday(timezone);
  const weekCells = recentDays(7, timezone);
  const weekStart = weekCells[0].date;

  const [goalsRes, mealsRes, habitsRes, entriesRes, weightRes, logRes, settingsRes, scoresRes] =
    await Promise.all([
      supabase.from("nutrition_goals").select("*").eq("user_id", user.id).order("effective_from", { ascending: false }).limit(1),
      supabase.from("meals").select("*, meal_items(*)").eq("user_id", user.id).eq("log_date", date).order("created_at"),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at"),
      supabase.from("habit_entries").select("habit_id, done, value").eq("user_id", user.id).eq("log_date", date),
      supabase.from("body_entries").select("log_date, weight_kg").eq("user_id", user.id).not("weight_kg", "is", null).order("log_date"),
      supabase.from("daily_logs").select("*").eq("user_id", user.id).eq("log_date", date).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      // Histórico materializado: sirve para calendario, racha y XP total.
      supabase.from("daily_scores").select("log_date, total, xp").eq("user_id", user.id).order("log_date", { ascending: false }).limit(730),
    ]);

  const goalRow = goalsRes.data?.[0];
  if (!goalRow) return { onboarded: false } as Dashboard;

  const goals: NutritionGoals = {
    kcal: goalRow.kcal,
    protein: goalRow.protein_g,
    carbs: goalRow.carbs_g,
    fat: goalRow.fat_g,
    waterMl: goalRow.water_ml,
  };

  const meals: Meal[] = (mealsRes.data ?? []).map((m: any) => ({
    id: m.id,
    type: m.meal_type as MealType,
    time: m.eaten_at ? new Date(m.eaten_at).toISOString().slice(11, 16) : undefined,
    planned: m.planned,
    emoji: MEAL_EMOJI[m.meal_type],
    items: (m.meal_items ?? []).map((it: any) => ({
      id: it.id,
      foodId: it.food_id,
      foodName: it.food_name,
      quantity: Number(it.quantity),
      base: it.base,
      macros: {
        kcal: Number(it.kcal),
        protein: Number(it.protein_g),
        carbs: Number(it.carbs_g),
        fat: Number(it.fat_g),
        fiber: Number(it.fiber_g),
      },
    })),
  }));
  const totals = dayTotals(meals);

  const entryMap = new Map<string, { done: boolean; value: number | null }>();
  (entriesRes.data ?? []).forEach((e: any) => entryMap.set(e.habit_id, { done: e.done, value: e.value }));

  const habitRows = habitsRes.data ?? [];
  const habits: Habit[] = habitRows.map((h: any) => {
    const e = entryMap.get(h.id);
    const unit = h.unit ?? "";
    const meta = h.target_value != null ? `${e?.value ?? 0} / ${h.target_value} ${unit}`.trim() : "diario";
    return { id: h.id, name: h.name, kind: h.kind, meta, done: e?.done ?? false };
  });

  // Hábitos clave (con objetivo numérico): agua, pasos, sueño.
  const keyHabits: KeyHabit[] = habitRows
    .filter((h: any) => h.target_value != null && /agua|camin|paso|dorm|sue/i.test(h.name))
    .slice(0, 3)
    .map((h: any) => {
      const e = entryMap.get(h.id);
      const value = Number(e?.value ?? 0);
      const target = Number(h.target_value) || 1;
      return {
        id: h.id,
        name: h.name,
        emoji: iconFor(h.name),
        value,
        target,
        unit: h.unit ?? "",
        pct: Math.min(100, Math.round((value / target) * 100)),
      };
    });

  const weight: WeightPoint[] = (weightRes.data ?? []).map((w: any) => ({ date: w.log_date, kg: Number(w.weight_kg) }));
  const weightTarget = profile?.target_weight_kg ?? (weight.length ? weight[weight.length - 1].kg : 80);

  // ---- Áreas ----
  const doneCount = habits.filter((h) => h.done).length;
  const nutritionAdh =
    meals.length > 0
      ? Math.round(
          (Math.min(100, (totals.kcal / (goals.kcal || 1)) * 100) +
            Math.min(100, (totals.protein / (goals.protein || 1)) * 100)) /
            2
        )
      : 0;
  const log: any = logRes.data;
  const areas: Partial<Record<AreaKey, AreaResult>> = {
    nutrition: { value: nutritionAdh, hasData: meals.length > 0 },
    habits: { value: habits.length ? (doneCount / habits.length) * 100 : 0, hasData: habits.length > 0 },
    rest: { value: (log?.sleep_quality ?? 0) * 10, hasData: log?.sleep_quality != null },
  };
  const weights = weightsFromSettings(settingsRes.data);
  const score = computeDay(areas, weights);
  const label = scoreLabel(score.total);
  const hasToday = score.activeAreas.length > 0;

  // Materializa el día actual (auto-cura: cada carga deja daily_scores al día).
  await upsertDayScore(supabase, user.id, date, score, weights);

  // ---- Histórico materializado (excluye la fila de hoy, que puede estar vieja) ----
  const history = (scoresRes.data ?? []).filter((r: any) => r.log_date !== date);
  const scoreByDate = new Map<string, number>();
  history.forEach((r: any) => scoreByDate.set(r.log_date, r.total));
  if (hasToday) scoreByDate.set(date, score.total);

  // ---- Racha: días consecutivos con score >= umbral ----
  const threshold = settingsRes.data?.streak_threshold ?? DEFAULT_STREAK_THRESHOLD;
  const streak = computeStreak(scoreByDate, date, threshold);

  // ---- Nivel: XP acumulado real (histórico + hoy recalculado) ----
  const xpTotal =
    history.reduce((s: number, r: any) => s + (r.xp ?? 0), 0) + (hasToday ? xpForScore(score.total) : 0);
  const level = levelFromXp(xpTotal);

  // ---- Calendario: score real por día desde daily_scores ----
  const calendar: CalendarDay[] = weekCells.map((c) => {
    if (c.date === date) return { ...c, score: hasToday ? score.total : null };
    return { ...c, score: scoreByDate.get(c.date) ?? null };
  });

  const checkin: Checkin = {
    done: !!log?.checkin_done_at,
    focusNote: log?.focus_note ?? null,
    weightKg: weight.length ? weight[weight.length - 1].kg : null,
  };

  return {
    onboarded: true,
    date,
    timezone,
    goals,
    meals,
    totals,
    habits,
    keyHabits,
    weight,
    weightTarget,
    streak,
    score,
    label,
    level,
    calendar,
    checkin,
  };
}

/** Racha ligera para el encabezado (desde daily_scores materializado). */
export async function getStreak(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const [settingsRes, scoresRes] = await Promise.all([
    supabase.from("user_settings").select("streak_threshold").eq("user_id", user.id).maybeSingle(),
    supabase.from("daily_scores").select("log_date, total").eq("user_id", user.id).order("log_date", { ascending: false }).limit(730),
  ]);

  const threshold = settingsRes.data?.streak_threshold ?? DEFAULT_STREAK_THRESHOLD;
  const scoreByDate = new Map<string, number>();
  (scoresRes.data ?? []).forEach((r: any) => scoreByDate.set(r.log_date, r.total));
  return computeStreak(scoreByDate, userToday(), threshold);
}

/** Días consecutivos (terminando hoy o ayer) con score >= umbral. */
function computeStreak(scoreByDate: Map<string, number>, today: string, threshold: number): number {
  const meets = (iso: string) => (scoreByDate.get(iso) ?? -1) >= threshold;
  let streak = 0;
  const d = new Date(today + "T00:00:00Z");
  if (!meets(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (meets(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}
