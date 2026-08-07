// ============================================================
// Lecturas por pantalla. Reglas:
// - NUNCA escriben (la materialización vive en las Server Actions).
// - Contexto (user + perfil + ajustes + "hoy") memoizado por request.
// - Queries acotadas: nada de traer tablas enteras.
// - Devuelven datos crudos; el formateo visual es de los componentes.
// ============================================================

import { getServerClient, getUserContext, resolveDay, type UserContext } from "@/lib/data/context";
import { dayTotals } from "@/lib/calculations/macros";
import {
  computeAreasForDay,
  nutritionAreaFor,
  computeDay,
  levelFromXp,
  scoreLabel,
  xpForScore,
  type DayScore,
} from "@/lib/calculations/scoring";
import { computeAchievements, dayInsights, type Achievement, type Insight } from "@/lib/calculations/insights";
import { projectProgress, objectiveProgress, type TaskStatus, type TaskPriority } from "@/lib/calculations/work";
import { daySummary, type DaySummary } from "@/lib/calculations/day-summary";
import type { NutritionResult } from "@/lib/calculations/nutrition-score";
import { dayFoodFacts } from "./nutrition-day";
import { stravaConfigured } from "@/lib/strava";
import { addDays, dayWindow, monthGrid, recentDays, type DayCell } from "@/lib/date";
import type { Habit, HabitCategory, Meal, MealType, NutritionGoals, WeightPoint } from "@/types";

const MEAL_EMOJI: Record<string, string> = {
  desayuno: "🥣",
  almuerzo: "🍗",
  merienda: "🥜",
  cena: "🌙",
  colacion: "🍎",
  bebida: "🥤",
};

/** Fallback para hábitos creados antes de que existiera habits.emoji. */
const HABIT_ICON: Record<string, string> = {
  agua: "💧",
  caminar: "👟",
  paso: "👟",
  dorm: "😴",
  sue: "😴",
  leer: "📚",
  entren: "🏋️",
  planific: "📋",
};

function iconFor(name: string, emoji: string | null): string {
  if (emoji) return emoji;
  const n = name.toLowerCase();
  for (const k of Object.keys(HABIT_ICON)) if (n.includes(k)) return HABIT_ICON[k];
  return "✓";
}

export interface CalendarDay extends DayCell {
  score: number | null; // null = sin datos
}

export interface Checkin {
  done: boolean;
  focusNote: string | null;
  focusDone: boolean | null;
  weightKg: number | null;
  mood: number | null;
  energy: number | null;
  sleepQuality: number | null;
  sleepHours: number | null;
  hunger: number | null;
  stress: number | null;
  waterMl: number;
}

export interface Dashboard {
  onboarded: boolean;
  date: string;
  timezone: string;
  goals: NutritionGoals;
  meals: Meal[];
  totals: ReturnType<typeof dayTotals>;
  habits: Habit[];
  keyHabits: Habit[];
  streak: number;
  score: DayScore;
  label: string;
  level: { level: number; inLevel: number; per: number };
  calendar: CalendarDay[];
  checkin: Checkin;
}

// ---------- Mapeos fila → dominio ----------

function mapGoals(row: {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}): NutritionGoals {
  return {
    kcal: row.kcal,
    protein: row.protein_g,
    carbs: row.carbs_g,
    fat: row.fat_g,
    waterMl: row.water_ml,
  };
}

type MealRow = {
  id: string;
  meal_type: string;
  eaten_at: string | null;
  planned: boolean | null;
  photo_path?: string | null;
  meal_items: {
    id: string;
    food_id: string | null;
    food_name: string;
    quantity: number;
    base: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  }[];
};

function mapMeals(rows: MealRow[], timezone: string): Meal[] {
  return rows.map((m) => ({
    id: m.id,
    type: m.meal_type as MealType,
    time: m.eaten_at
      ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(
          new Date(m.eaten_at)
        )
      : undefined,
    planned: m.planned ?? false,
    emoji: MEAL_EMOJI[m.meal_type],
    items: (m.meal_items ?? []).map((it) => ({
      id: it.id,
      foodId: it.food_id ?? "",
      foodName: it.food_name,
      quantity: Number(it.quantity),
      base: it.base as Meal["items"][number]["base"],
      macros: {
        kcal: Number(it.kcal),
        protein: Number(it.protein_g),
        carbs: Number(it.carbs_g),
        fat: Number(it.fat_g),
        fiber: Number(it.fiber_g),
      },
    })),
  }));
}

type HabitRow = {
  id: string;
  name: string;
  kind: string;
  target_value: number | null;
  unit: string | null;
  emoji: string | null;
  is_key: boolean | null;
  display_order: number | null;
  category?: string | null;
  group_key?: string | null;
};

const HABIT_COLS = "id, name, kind, target_value, unit, emoji, is_key, display_order, category, group_key";

function mapHabits(
  rows: HabitRow[],
  entries: { habit_id: string; done: boolean | null; value: number | null }[]
): Habit[] {
  const entryMap = new Map(entries.map((e) => [e.habit_id, e]));
  return rows.map((h) => {
    const e = entryMap.get(h.id);
    return {
      id: h.id,
      name: h.name,
      kind: h.kind as Habit["kind"],
      done: e?.done ?? false,
      value: Number(e?.value ?? 0),
      target: h.target_value != null ? Number(h.target_value) : null,
      unit: h.unit ?? "",
      emoji: iconFor(h.name, h.emoji),
      isKey: h.is_key ?? false,
      category: (h.category ?? "routine") as Habit["category"],
      groupKey: h.group_key ?? null,
    };
  });
}

/** Hábitos clave para el dashboard: is_key primero; fallback legacy por nombre. */
function pickKeyHabits(habits: Habit[]): Habit[] {
  const flagged = habits.filter((h) => h.isKey && h.target != null);
  if (flagged.length > 0) return flagged.slice(0, 3);
  return habits.filter((h) => h.target != null && /agua|camin|paso|dorm|sue/i.test(h.name)).slice(0, 3);
}

// ---------- Racha / XP ----------

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

/** Histórico materializado (2 años máx.) → racha, XP y calendario. */
async function getScoreHistory(ctx: UserContext) {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("daily_scores")
    .select("log_date, total, xp")
    .eq("user_id", ctx.userId)
    .order("log_date", { ascending: false })
    .limit(730);
  return data ?? [];
}

// ============================================================
// Dashboard Hoy
// ============================================================

export async function getDashboard(): Promise<Dashboard | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();
  const { today: date, timezone } = ctx;
  // Ventana amplia: el calendario se desliza al mes anterior y al siguiente.
  const weekCells = dayWindow(45, 30, timezone);

  const [goalsRes, mealsRes, habitsRes, entriesRes, lastWeightRes, logRes, historyRes, facts, tasksRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase.from("meals").select("id, meal_type, eaten_at, planned, meal_items(*)").eq("user_id", ctx.userId).eq("log_date", date).order("created_at"),
    supabase
      .from("habits")
      .select(HABIT_COLS)
      .eq("user_id", ctx.userId)
      .eq("active", true)
      .order("display_order")
      .order("created_at"),
    supabase.from("habit_entries").select("habit_id, done, value").eq("user_id", ctx.userId).eq("log_date", date),
    supabase
      .from("body_entries")
      .select("weight_kg")
      .eq("user_id", ctx.userId)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: false })
      .limit(1),
    supabase
      .from("daily_logs")
      .select("mood, energy, sleep_quality, sleep_h, hunger, stress, focus_note, focus_done, checkin_done_at, water_ml")
      .eq("user_id", ctx.userId)
      .eq("log_date", date)
      .maybeSingle(),
    getScoreHistory(ctx),
    dayFoodFacts(supabase, ctx.userId, date),
    supabase.from("tasks").select("status, due_date").eq("user_id", ctx.userId).lte("due_date", date),
  ]);

  const goalRow = goalsRes.data?.[0];
  if (!goalRow) return { onboarded: false } as Dashboard;

  const goals = mapGoals(goalRow);
  const meals = mapMeals((mealsRes.data ?? []) as MealRow[], timezone);
  const totals = dayTotals(meals);
  const habits = mapHabits((habitsRes.data ?? []) as HabitRow[], entriesRes.data ?? []);
  const log = logRes.data;

  // ---- Score del día (mismo cálculo que la materialización) ----
  const waterHabit = habits.find((h) => h.unit.toLowerCase() === "l");
  const waterL = waterHabit ? waterHabit.value : (log?.water_ml ?? 0) / 1000;
  const waterGoalL = waterHabit?.target ?? goals.waterMl / 1000;

  const areaInputs = {
    totals: { kcal: totals.kcal, protein: totals.protein },
    mealCount: meals.length,
    goals: { kcal: goals.kcal, protein: goals.protein },
    waterL,
    waterGoalL,
    vegetableServings: facts.vegetableServings,
    fruitServings: facts.fruitServings,
    processedKcal: facts.processedKcal,
    qualityScoreSum: facts.qualityScoreSum,
    qualityScoredKcal: facts.qualityScoredKcal,
    habits: habits.map((h) => ({ done: h.done })),
    sleepQuality: log?.sleep_quality ?? null,
    tasks: (tasksRes.data ?? []).map((t) => ({ status: t.status as TaskStatus, dueDate: t.due_date })),
    today: date,
  };
  const areas = computeAreasForDay(areaInputs);
  const score = computeDay(areas, ctx.weights);
  const label = scoreLabel(score.total);
  const hasToday = score.activeAreas.length > 0;

  // ---- Histórico → racha, XP, calendario ----
  const history = historyRes.filter((r) => r.log_date !== date);
  const scoreByDate = new Map<string, number>();
  history.forEach((r) => scoreByDate.set(r.log_date, r.total));
  if (hasToday) scoreByDate.set(date, score.total);

  const streak = computeStreak(scoreByDate, date, ctx.streakThreshold);
  const xpTotal = history.reduce((s, r) => s + (r.xp ?? 0), 0) + (hasToday ? xpForScore(score.total) : 0);
  const level = levelFromXp(xpTotal);

  const calendar: CalendarDay[] = weekCells.map((c) => {
    if (c.date === date) return { ...c, score: hasToday ? score.total : null };
    return { ...c, score: scoreByDate.get(c.date) ?? null };
  });

  const checkin: Checkin = {
    done: !!log?.checkin_done_at,
    focusNote: log?.focus_note ?? null,
    focusDone: log?.focus_done ?? null,
    weightKg: lastWeightRes.data?.[0]?.weight_kg != null ? Number(lastWeightRes.data[0].weight_kg) : null,
    mood: log?.mood ?? null,
    energy: log?.energy ?? null,
    sleepQuality: log?.sleep_quality ?? null,
    sleepHours: (() => {
      const sh = habits.find((h) => h.unit.toLowerCase() === "h" && /dorm|sue/i.test(h.name));
      return sh && sh.value > 0 ? sh.value : log?.sleep_h != null ? Number(log.sleep_h) : null;
    })(),
    hunger: log?.hunger ?? null,
    stress: log?.stress ?? null,
    waterMl: log?.water_ml ?? 0,
  };

  return {
    onboarded: true,
    date,
    timezone,
    goals,
    meals,
    totals,
    habits,
    keyHabits: pickKeyHabits(habits),
    streak,
    score,
    label,
    level,
    calendar,
    checkin,
  };
}

// ============================================================
// Nutrición
// ============================================================

export interface NutritionDay {
  onboarded: boolean;
  date: string;
  isToday: boolean;
  /** "Hoy" real del servidor: tope de la navegación por fecha. */
  todayDate: string;
  timezone: string;
  goals: NutritionGoals;
  meals: Meal[];
  totals: ReturnType<typeof dayTotals>;
  waterMl: number;
}

export async function getNutritionDay(day?: string): Promise<NutritionDay | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const { date, isToday } = resolveDay(ctx.today, day);
  const supabase = getServerClient();

  const [goalsRes, mealsRes, logRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      // Metas vigentes ese día. Se traen ordenadas y se elige en memoria:
      // si el día es anterior a la primera meta, igual se usa esa, porque
      // "sin meta" haría rebotar la pantalla al onboarding.
      .select("kcal, protein_g, carbs_g, fat_g, water_ml, effective_from")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(20),
    supabase
      .from("meals")
      .select("id, meal_type, eaten_at, planned, photo_path, meal_items(*)")
      .eq("user_id", ctx.userId)
      .eq("log_date", date)
      .order("created_at"),
    supabase.from("daily_logs").select("water_ml").eq("user_id", ctx.userId).eq("log_date", date).maybeSingle(),
  ]);

  const goalRows = goalsRes.data ?? [];
  const goalRow = goalRows.find((g) => g.effective_from <= date) ?? goalRows[goalRows.length - 1];
  if (!goalRow) return { onboarded: false } as NutritionDay;

  const rows = (mealsRes.data ?? []) as MealRow[];
  const meals = mapMeals(rows, ctx.timezone);

  // Una sola llamada para firmar todas las miniaturas del día.
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("meals").createSignedUrls(paths, 3600);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
    meals.forEach((m, i) => {
      const p = rows[i].photo_path;
      if (p) m.photoUrl = urlByPath.get(p) ?? null;
    });
  }

  return {
    onboarded: true,
    date,
    isToday,
    todayDate: ctx.today,
    timezone: ctx.timezone,
    goals: mapGoals(goalRow),
    meals,
    totals: dayTotals(meals),
    waterMl: logRes.data?.water_ml ?? 0,
  };
}

/** URL firmada (1 h) de una foto del bucket privado `meals`. */
async function signedPhoto(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = getServerClient();
  const { data } = await supabase.storage.from("meals").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export interface MealDetail {
  id: string;
  type: MealType;
  label: string;
  emoji: string;
  time?: string;
  note: string | null;
  photoUrl: string | null;
  photoPath: string | null;
  totals: ReturnType<typeof dayTotals>;
  items: { id: string; name: string; quantity: number; base: string; kcal: number; protein: number; carbs: number; fat: number }[];
}

export const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  colacion: "Colación",
  bebida: "Bebida",
};

export async function getMealDetail(mealId: string): Promise<MealDetail | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const { data } = await supabase
    .from("meals")
    .select("id, meal_type, eaten_at, planned, note, photo_path, meal_items(*)")
    .eq("id", mealId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!data) return null;

  const mapped = mapMeals([data as unknown as MealRow], ctx.timezone)[0];
  return {
    id: data.id,
    type: mapped.type,
    label: MEAL_LABEL[data.meal_type] ?? data.meal_type,
    emoji: mapped.emoji ?? "🍽",
    time: mapped.time,
    note: data.note,
    photoPath: data.photo_path,
    photoUrl: await signedPhoto(data.photo_path),
    totals: dayTotals([mapped]),
    items: mapped.items.map((i) => ({
      id: i.id,
      name: i.foodName,
      quantity: i.quantity,
      base: i.base,
      kcal: i.macros.kcal,
      protein: i.macros.protein,
      carbs: i.macros.carbs,
      fat: i.macros.fat,
    })),
  };
}

// ============================================================
// Hábitos
// ============================================================

/**
 * Hábitos con el historial de los últimos 7 días para los mini gráficos.
 * `categories` filtra por página temática (null = todas).
 */
export async function getHabitsDay(
  categories?: HabitCategory[],
  day?: string
): Promise<{ date: string; isToday: boolean; todayDate: string; timezone: string; habits: Habit[]; threshold: number; days: DayCell[] } | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const { date, isToday } = resolveDay(ctx.today, day);
  const supabase = getServerClient();
  const week = recentDays(7, ctx.timezone);
  const from = week[0].date;

  let habitsQ = supabase
    .from("habits")
    .select(HABIT_COLS)
    .eq("user_id", ctx.userId)
    .eq("active", true)
    .order("display_order")
    .order("created_at");
  if (categories?.length) habitsQ = habitsQ.in("category", categories);

  const [habitsRes, entriesRes] = await Promise.all([
    habitsQ,
    supabase
      .from("habit_entries")
      .select("habit_id, done, value, log_date")
      .eq("user_id", ctx.userId)
      .gte("log_date", from < date ? from : date)
      .lte("log_date", ctx.today),
  ]);

  const all = entriesRes.data ?? [];
  const today = all.filter((e) => e.log_date === date);
  const habits = mapHabits((habitsRes.data ?? []) as HabitRow[], today);

  // Historial por hábito, alineado a los 7 días (rellena huecos con 0).
  const byHabit = new Map<string, Map<string, { value: number; done: boolean }>>();
  all.forEach((e) => {
    if (!byHabit.has(e.habit_id)) byHabit.set(e.habit_id, new Map());
    byHabit.get(e.habit_id)!.set(e.log_date, { value: Number(e.value ?? 0), done: e.done ?? false });
  });
  habits.forEach((h) => {
    const m = byHabit.get(h.id);
    h.history = week.map((d) => ({
      date: d.date,
      value: m?.get(d.date)?.value ?? 0,
      done: m?.get(d.date)?.done ?? false,
    }));
  });

  return { date, isToday, todayDate: ctx.today, timezone: ctx.timezone, habits, threshold: ctx.streakThreshold, days: week };
}

// ============================================================
// Actividad
// ============================================================

export interface WorkoutRow {
  id: string;
  kind: string;
  minutes: number;
  intensity: string;
  distanceKm: number | null;
  steps: number | null;
  kcal: number;
  note: string | null;
  date: string;
}

export interface ActivityDay {
  date: string;
  isToday: boolean;
  /** "Hoy" real del servidor: tope de la navegación por fecha. */
  todayDate: string;
  timezone: string;
  habits: Habit[];
  /** Hábitos cuyo valor sale de las sesiones registradas, no de un stepper. */
  autoHabitIds: string[];
  today: WorkoutRow[];
  week: WorkoutRow[];
  weightKg: number;
  heightCm: number | null;
}

export async function getActivityDay(day?: string): Promise<ActivityDay | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const { date, isToday } = resolveDay(ctx.today, day);
  const supabase = getServerClient();
  const week = recentDays(7, ctx.timezone);
  const from = week[0].date;

  const [habitsData, workoutsRes, weightRes] = await Promise.all([
    getHabitsDay(["activity"], date),
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", ctx.userId)
      .gte("log_date", from < date ? from : date)
      .lte("log_date", ctx.today)
      .order("created_at", { ascending: false }),
    supabase
      .from("body_entries")
      .select("weight_kg")
      .eq("user_id", ctx.userId)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: false })
      .limit(1),
  ]);

  const map = (w: NonNullable<typeof workoutsRes.data>[number]): WorkoutRow => ({
    id: w.id,
    kind: w.kind,
    minutes: w.minutes,
    intensity: w.intensity,
    distanceKm: w.distance_km != null ? Number(w.distance_km) : null,
    steps: w.steps,
    kcal: w.kcal,
    note: w.note,
    date: w.log_date,
  });
  const all = (workoutsRes.data ?? []).map(map);
  const todayWorkouts = all.filter((w) => w.date === date);

  // Los hábitos de movimiento se alimentan de lo registrado: pasos del día
  // y sesiones de la semana (la unidad "x/sem" es semanal por definición).
  const stepsToday = todayWorkouts.reduce((s, w) => s + (w.steps ?? 0), 0);
  const habits = habitsData?.habits ?? [];
  const autoHabitIds: string[] = [];
  habits.forEach((h) => {
    const unit = h.unit.toLowerCase();
    if (unit.includes("paso")) {
      // El máximo entre lo cargado a mano y lo que suman las sesiones: el
      // teléfono cuenta el día entero, incluidos los pasos por la casa.
      h.value = Math.max(h.value, stepsToday);
      h.done = h.target ? h.value >= h.target : h.value > 0;
    } else if (unit === "x/sem") {
      h.value = all.length;
      h.done = h.target ? h.value >= h.target : h.value > 0;
      autoHabitIds.push(h.id);
    }
  });

  return {
    date,
    isToday,
    todayDate: ctx.today,
    timezone: ctx.timezone,
    habits,
    autoHabitIds,
    today: todayWorkouts,
    week: all,
    weightKg: weightRes.data?.[0]?.weight_kg != null ? Number(weightRes.data[0].weight_kg) : 0,
    heightCm: ctx.profile?.height_cm != null ? Number(ctx.profile.height_cm) : null,
  };
}

// ============================================================
// Progreso
// ============================================================

export interface DayDetail {
  date: string;
  label: string;
  total: number;
  items: { label: string; emoji: string; done: boolean; detail?: string }[];
}

export interface Progress {
  date: string;
  weight: WeightPoint[];
  weightTarget: number;
  streak: number;
  calendar: CalendarDay[];
  achievements: Achievement[];
  bestStreak: number;
  daysLogged: number;
  perfectDays: number;
  avgScore: number | null;
  threshold: number;
  timezone: string;
  /** Mes visible por defecto en el calendario ("YYYY-MM"). */
  month: string;
  monthDays: DayDetail[];
}

/** Racha más larga del histórico (no solo la vigente). */
function bestStreakOf(scoreByDate: Map<string, number>, threshold: number): number {
  const dates = [...scoreByDate.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if ((scoreByDate.get(d) ?? -1) < threshold) {
      run = 0;
      prev = d;
      continue;
    }
    const consecutive = prev != null && Math.round((Date.parse(d) - Date.parse(prev)) / 86400000) === 1;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}


/**
 * Detalle día por día en un rango: qué se cumplió y qué no.
 * Lo usan tanto Progreso (mes visible) como la consulta puntual del modal.
 */
export async function buildDayDetails(from: string, to: string): Promise<DayDetail[]> {
  const ctx = await getUserContext();
  if (!ctx) return [];
  const supabase = getServerClient();

  const [habitsRes, entriesRes, mealsRes, workoutsRes, scoresRes] = await Promise.all([
    supabase.from("habits").select(HABIT_COLS).eq("user_id", ctx.userId).eq("active", true).order("display_order"),
    supabase
      .from("habit_entries")
      .select("habit_id, done, value, log_date")
      .eq("user_id", ctx.userId)
      .gte("log_date", from)
      .lte("log_date", to),
    supabase.from("meals").select("log_date").eq("user_id", ctx.userId).gte("log_date", from).lte("log_date", to),
    supabase
      .from("workouts")
      .select("log_date, minutes, kcal")
      .eq("user_id", ctx.userId)
      .gte("log_date", from)
      .lte("log_date", to),
    supabase
      .from("daily_scores")
      .select("log_date, total")
      .eq("user_id", ctx.userId)
      .gte("log_date", from)
      .lte("log_date", to),
  ]);

  const habitRows = (habitsRes.data ?? []) as HabitRow[];
  const byDate = new Map<string, Map<string, { done: boolean; value: number }>>();
  (entriesRes.data ?? []).forEach((e) => {
    if (!byDate.has(e.log_date)) byDate.set(e.log_date, new Map());
    byDate.get(e.log_date)!.set(e.habit_id, { done: e.done ?? false, value: Number(e.value ?? 0) });
  });
  const mealDates = new Set((mealsRes.data ?? []).map((m) => m.log_date));
  const workoutByDate = new Map<string, { minutes: number; kcal: number }>();
  (workoutsRes.data ?? []).forEach((w) => {
    const cur = workoutByDate.get(w.log_date) ?? { minutes: 0, kcal: 0 };
    workoutByDate.set(w.log_date, { minutes: cur.minutes + w.minutes, kcal: cur.kcal + w.kcal });
  });
  const totals = new Map((scoresRes.data ?? []).map((r) => [r.log_date, r.total]));

  const out: DayDetail[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const m = byDate.get(d);
    // Los del mismo grupo (suplementos) van seguidos: intercalados con el
    // resto se leen como si faltara alguno.
    const ordered = [...habitRows].sort((a, b) => (a.group_key ?? "").localeCompare(b.group_key ?? ""));
    const items = ordered.map((h) => {
      const e = m?.get(h.id);
      const dec = ["l", "h"].includes((h.unit ?? "").toLowerCase()) ? 1 : 0;
      return {
        label: h.name,
        emoji: iconFor(h.name, h.emoji),
        done: e?.done ?? false,
        detail:
          h.target_value != null
            ? `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(e?.value ?? 0)} / ${h.target_value} ${h.unit ?? ""}`.trim()
            : undefined,
      };
    });

    const w = workoutByDate.get(d);
    items.unshift({
      label: "Actividad",
      emoji: "🏃",
      done: !!w,
      detail: w ? `${w.minutes} min · ${w.kcal} kcal` : undefined,
    });
    items.unshift({
      label: "Comidas registradas",
      emoji: "🍽",
      done: mealDates.has(d),
      detail: undefined,
    });

    out.push({
      date: d,
      label: labelFor(d),
      total: totals.get(d) ?? 0,
      items,
    });
  }
  return out;
}

/** "Mar 4 Ago" a partir de una fecha ISO. */
function labelFor(iso: string): string {
  const f = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(iso + "T12:00:00Z")
  );
  return f.replace(/\./g, "").replace(/\w/g, (c) => c.toUpperCase());
}

export async function getProgress(): Promise<Progress | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();
  const week = recentDays(7, ctx.timezone);
  const [weightRes, historyRes, mealsCountRes] = await Promise.all([
    supabase
      .from("body_entries")
      .select("log_date, weight_kg")
      .eq("user_id", ctx.userId)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: false })
      .limit(400),
    getScoreHistory(ctx),
    supabase.from("meals").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId),
  ]);

  const weight: WeightPoint[] = (weightRes.data ?? [])
    .reverse()
    .map((w) => ({ date: w.log_date, kg: Number(w.weight_kg) }));

  const scoreByDate = new Map<string, number>();
  historyRes.forEach((r) => scoreByDate.set(r.log_date, r.total));
  const streak = computeStreak(scoreByDate, ctx.today, ctx.streakThreshold);
  const calendar: CalendarDay[] = week.map((c) => ({ ...c, score: scoreByDate.get(c.date) ?? null }));

  const totals = [...scoreByDate.values()];
  const perfectDays = totals.filter((t) => t >= 100).length;
  const avgScore = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
  const bestStreak = Math.max(streak, bestStreakOf(scoreByDate, ctx.streakThreshold));

  const achievements = computeAchievements({
    streak,
    bestStreak,
    daysLogged: scoreByDate.size,
    totalMeals: mealsCountRes.count ?? 0,
    perfectDays,
    weightLogged: weight.length,
  });

  const weightTarget =
    ctx.profile?.target_weight_kg != null
      ? Number(ctx.profile.target_weight_kg)
      : weight.length
        ? weight[weight.length - 1].kg
        : 80;

  // Calendario: mes en curso con el detalle de cada día.
  const month = ctx.today.slice(0, 7);
  const grid = monthGrid(month, ctx.timezone);
  const monthDays = await buildDayDetails(grid[0].date, grid[grid.length - 1].date);

  return {
    date: ctx.today,
    weight,
    weightTarget,
    streak,
    calendar,
    achievements,
    bestStreak,
    daysLogged: scoreByDate.size,
    perfectDays,
    avgScore,
    threshold: ctx.streakThreshold,
    timezone: ctx.timezone,
    month,
    monthDays,
  };
}

// ============================================================
// Shell (layout): racha, check-in del día y último peso.
// Una sola lectura para header, sidebar y las hojas de registro.
// ============================================================

export interface ShellData {
  streak: number;
  checkin: Checkin;
  lastWeightKg: number | null;
  habits: Habit[];
  heightCm: number | null;
  alerts: Insight[];
  proteinToday: number;
  proteinGoal: number;
  /** "Hoy" del servidor: tope del selector de día del peso. */
  today: string;
}

export async function getShellData(): Promise<ShellData | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [logRes, lastWeightRes, history, habitsRes, entriesRes, goalsRes, mealsRes] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("mood, energy, sleep_quality, sleep_h, hunger, stress, focus_note, focus_done, checkin_done_at, water_ml")
      .eq("user_id", ctx.userId)
      .eq("log_date", ctx.today)
      .maybeSingle(),
    supabase
      .from("body_entries")
      .select("weight_kg")
      .eq("user_id", ctx.userId)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: false })
      .limit(1),
    getScoreHistory(ctx),
    supabase
      .from("habits")
      .select(HABIT_COLS)
      .eq("user_id", ctx.userId)
      .eq("active", true)
      .order("display_order")
      .order("created_at"),
    supabase.from("habit_entries").select("habit_id, done, value").eq("user_id", ctx.userId).eq("log_date", ctx.today),
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, water_ml")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase.from("meals").select("id, meal_items(kcal, protein_g)").eq("user_id", ctx.userId).eq("log_date", ctx.today),
  ]);

  const scoreByDate = new Map<string, number>();
  history.forEach((r) => scoreByDate.set(r.log_date, r.total));
  const log = logRes.data;
  const lastWeightKg = lastWeightRes.data?.[0]?.weight_kg != null ? Number(lastWeightRes.data[0].weight_kg) : null;
  const habits = mapHabits((habitsRes.data ?? []) as HabitRow[], entriesRes.data ?? []);
  const streak = computeStreak(scoreByDate, ctx.today, ctx.streakThreshold);

  // Avisos de la campanita: mismas reglas que las recomendaciones de Hoy.
  const goalRow = goalsRes.data?.[0];
  const meals = mealsRes.data ?? [];
  let kcal = 0;
  let protein = 0;
  meals.forEach((m) =>
    (m.meal_items ?? []).forEach((it) => {
      kcal += Number(it.kcal);
      protein += Number(it.protein_g);
    })
  );
  const waterHabit = habits.find((h) => h.unit.toLowerCase() === "l" && /agua/i.test(h.name));
  const sleepHabitRow = habits.find((h) => h.unit.toLowerCase() === "h" && /dorm|sue/i.test(h.name));
  const sleepFromHabit = sleepHabitRow && sleepHabitRow.value > 0 ? sleepHabitRow.value : null;
  const alerts = dayInsights({
    score: 0,
    breakdown: {} as never,
    kcal,
    kcalGoal: goalRow?.kcal ?? 0,
    protein,
    proteinGoal: goalRow?.protein_g ?? 0,
    mealsCount: meals.length,
    pendingHabits: habits.filter((h) => !h.done).map((h) => ({ name: h.name, emoji: h.emoji })),
    waterMl: waterHabit ? waterHabit.value * 1000 : (log?.water_ml ?? 0),
    waterGoalMl: waterHabit?.target ? waterHabit.target * 1000 : (goalRow?.water_ml ?? 0),
    checkinDone: !!log?.checkin_done_at,
    streak,
    hour: new Date().getHours(),
  });

  // El día cerrado se avisa acá: al pasar la medianoche, el resumen de ayer
  // aparece en la campanita hasta que se abre.
  const yesterday = addDays(ctx.today, -1);
  const { count: yesterdayMeals } = await supabase
    .from("meals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("log_date", yesterday);
  if (yesterdayMeals && yesterdayMeals > 0) {
    alerts.unshift({
      id: `summary-${yesterday}`,
      emoji: "📊",
      title: "Ver resumen del día",
      detail: "Cerró el día de ayer. Mirá cómo te fue y qué conviene mover hoy.",
      tone: "neutral",
      summaryDate: yesterday,
    });
  }

  return {
    streak,
    checkin: {
      done: !!log?.checkin_done_at,
      focusNote: log?.focus_note ?? null,
      focusDone: log?.focus_done ?? null,
      weightKg: lastWeightKg,
      mood: log?.mood ?? null,
      energy: log?.energy ?? null,
      sleepQuality: log?.sleep_quality ?? null,
      // El hábito manda: es donde se carga desde Rutina.
      sleepHours: sleepFromHabit ?? (log?.sleep_h != null ? Number(log.sleep_h) : null),
      hunger: log?.hunger ?? null,
      stress: log?.stress ?? null,
      waterMl: log?.water_ml ?? 0,
    },
    lastWeightKg,
    habits,
    heightCm: ctx.profile?.height_cm != null ? Number(ctx.profile.height_cm) : null,
    alerts,
    proteinToday: Math.round(protein),
    proteinGoal: goalRow?.protein_g ?? 0,
    today: ctx.today,
  };
}

// ============================================================
// Ajustes
// ============================================================

export interface SettingsData {
  profile: UserContext["profile"];
  settings: UserContext["settings"];
  goals: (NutritionGoals & { mode: string }) | null;
  habits: Habit[];
  lastWeightKg: number | null;
  strava: {
    connected: boolean;
    athleteName: string | null;
    connectedAt: string | null;
    activities: number;
    /** Si el servidor tiene las credenciales: sin ellas no hay nada que ofrecer. */
    configured: boolean;
  };
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [goalsRes, habitsRes, lastWeightRes, stravaRes, stravaCount] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, carbs_g, fat_g, water_ml, mode")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase
      .from("habits")
      .select(HABIT_COLS)
      .eq("user_id", ctx.userId)
      .eq("active", true)
      .order("display_order")
      .order("created_at"),
    supabase
      .from("body_entries")
      .select("weight_kg")
      .eq("user_id", ctx.userId)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: false })
      .limit(1),
    supabase.from("strava_connections").select("athlete_name, connected_at").eq("user_id", ctx.userId).maybeSingle(),
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("source", "strava"),
  ]);

  const goalRow = goalsRes.data?.[0];
  return {
    profile: ctx.profile,
    settings: ctx.settings,
    goals: goalRow ? { ...mapGoals(goalRow), mode: goalRow.mode ?? "manual" } : null,
    habits: mapHabits((habitsRes.data ?? []) as HabitRow[], []),
    lastWeightKg: lastWeightRes.data?.[0]?.weight_kg != null ? Number(lastWeightRes.data[0].weight_kg) : null,
    strava: {
      connected: !!stravaRes.data,
      athleteName: stravaRes.data?.athlete_name ?? null,
      connectedAt: stravaRes.data?.connected_at ?? null,
      activities: stravaCount.count ?? 0,
      configured: stravaConfigured(),
    },
  };
}

// ============================================================
// Resumen de un día cualquiera (no solo hoy).
// Lo usan la campanita al cerrar el día y el detalle del día en Progreso.
// ============================================================

export interface DaySummaryPayload {
  date: string;
  label: string;
  summary: DaySummary;
  parts: NutritionResult["parts"];
}

export async function getDaySummary(day: string): Promise<DaySummaryPayload | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const { date } = resolveDay(ctx.today, day);
  // El resumen es el cierre del día: mientras el día corre, no hay nada que cerrar.
  if (date >= ctx.today) return null;
  const supabase = getServerClient();

  const [goalsRes, facts, logRes, waterHabitRes, scoresRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, water_ml, effective_from")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(20),
    dayFoodFacts(supabase, ctx.userId, date),
    supabase.from("daily_logs").select("water_ml").eq("user_id", ctx.userId).eq("log_date", date).maybeSingle(),
    supabase.from("habits").select("id, unit, target_value").eq("user_id", ctx.userId).eq("active", true),
    supabase
      .from("daily_scores")
      .select("log_date, total")
      .eq("user_id", ctx.userId)
      .lte("log_date", date)
      .order("log_date", { ascending: false })
      .limit(400),
  ]);

  const goalRows = goalsRes.data ?? [];
  const goalRow = goalRows.find((g) => g.effective_from <= date) ?? goalRows[goalRows.length - 1];
  if (!goalRow) return null;

  // El agua puede venir del hábito (vasos) o del registro suelto del día.
  const waterHabit = (waterHabitRes.data ?? []).find((h) => (h.unit ?? "").toLowerCase() === "l");
  let waterL = (logRes.data?.water_ml ?? 0) / 1000;
  if (waterHabit) {
    const { data: entry } = await supabase
      .from("habit_entries")
      .select("value")
      .eq("habit_id", waterHabit.id)
      .eq("log_date", date)
      .maybeSingle();
    waterL = Number(entry?.value ?? 0);
  }
  const waterGoalL = waterHabit?.target_value != null ? Number(waterHabit.target_value) : goalRow.water_ml / 1000;

  const nutrition = nutritionAreaFor({
    totals: { kcal: facts.kcal, protein: facts.protein },
    mealCount: facts.mealCount,
    goals: { kcal: goalRow.kcal, protein: goalRow.protein_g },
    waterL,
    waterGoalL,
    vegetableServings: facts.vegetableServings,
    fruitServings: facts.fruitServings,
    processedKcal: facts.processedKcal,
    qualityScoreSum: facts.qualityScoreSum,
    qualityScoredKcal: facts.qualityScoredKcal,
    habits: [],
    sleepQuality: null,
  });

  const scoreByDate = new Map((scoresRes.data ?? []).map((r) => [r.log_date, r.total]));
  const streak = computeStreak(scoreByDate, date, ctx.streakThreshold);
  const dayTotal = scoreByDate.get(date) ?? null;

  return {
    date,
    label: new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(date + "T12:00:00Z")
    ),
    summary: daySummary({
      nutrition,
      kcal: facts.kcal,
      kcalGoal: goalRow.kcal,
      protein: facts.protein,
      proteinGoal: goalRow.protein_g,
      waterL,
      waterGoalL,
      vegetableServings: facts.vegetableServings,
      fruitServings: facts.fruitServings,
      mealCount: facts.mealCount,
      streak,
      dayTotal,
    }),
    parts: nutrition.parts,
  };
}

// ============================================================
// Trabajo: objetivos, proyectos y tareas
// ============================================================

export interface TaskItemRow {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimateMin: number | null;
  items: TaskItemRow[];
}

export interface Project {
  id: string;
  objectiveId: string | null;
  name: string;
  emoji: string | null;
  color: string | null;
  status: string;
  progress: number;
  taskCount: number;
}

export interface Objective {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  targetDate: string | null;
  status: string;
  progress: number;
}

export interface WorkData {
  today: string;
  objectives: Objective[];
  projects: Project[];
  tasks: Task[];
  /** Minutos de foco registrados hoy. */
  pomodoroToday: number;
}

export async function getWork(): Promise<WorkData | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [objRes, projRes, taskRes, itemRes, pomoRes] = await Promise.all([
    supabase.from("objectives").select("*").eq("user_id", ctx.userId).neq("status", "archivado").order("display_order"),
    supabase.from("projects").select("*").eq("user_id", ctx.userId).neq("status", "archivado").order("display_order"),
    supabase
      .from("tasks")
      .select("id, project_id, title, description, status, priority, due_date, estimate_min")
      .eq("user_id", ctx.userId)
      .order("display_order"),
    supabase.from("task_items").select("id, task_id, title, done").eq("user_id", ctx.userId).order("display_order"),
    supabase
      .from("pomodoro_sessions")
      .select("minutes")
      .eq("user_id", ctx.userId)
      .eq("log_date", ctx.today)
      .eq("kind", "foco"),
  ]);

  const itemsByTask = new Map<string, TaskItemRow[]>();
  (itemRes.data ?? []).forEach((i) => {
    const list = itemsByTask.get(i.task_id) ?? [];
    list.push({ id: i.id, title: i.title, done: i.done });
    itemsByTask.set(i.task_id, list);
  });

  const tasks: Task[] = (taskRes.data ?? []).map((t) => ({
    id: t.id,
    projectId: t.project_id,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    dueDate: t.due_date,
    estimateMin: t.estimate_min,
    items: itemsByTask.get(t.id) ?? [],
  }));

  const projects: Project[] = (projRes.data ?? []).map((p) => {
    const mine = tasks.filter((t) => t.projectId === p.id);
    return {
      id: p.id,
      objectiveId: p.objective_id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      status: p.status,
      progress: projectProgress(mine),
      taskCount: mine.length,
    };
  });

  const objectives: Objective[] = (objRes.data ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    emoji: o.emoji,
    targetDate: o.target_date,
    status: o.status,
    progress: objectiveProgress(projects.filter((p) => p.objectiveId === o.id)),
  }));

  return {
    today: ctx.today,
    objectives,
    projects,
    tasks,
    pomodoroToday: (pomoRes.data ?? []).reduce((s, r) => s + r.minutes, 0),
  };
}
