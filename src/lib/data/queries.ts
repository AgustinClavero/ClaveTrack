// ============================================================
// Lecturas por pantalla. Reglas:
// - NUNCA escriben (la materialización vive en las Server Actions).
// - Contexto (user + perfil + ajustes + "hoy") memoizado por request.
// - Queries acotadas: nada de traer tablas enteras.
// - Devuelven datos crudos; el formateo visual es de los componentes.
// ============================================================

import { getServerClient, getUserContext, type UserContext } from "@/lib/data/context";
import { dayTotals } from "@/lib/calculations/macros";
import {
  computeAreasForDay,
  computeDay,
  levelFromXp,
  scoreLabel,
  xpForScore,
  type DayScore,
} from "@/lib/calculations/scoring";
import { dayWindow, recentDays, type DayCell } from "@/lib/date";
import type { Habit, Meal, MealType, NutritionGoals, WeightPoint } from "@/types";

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
  weightKg: number | null;
  mood: number | null;
  energy: number | null;
  sleepQuality: number | null;
  hunger: number | null;
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
};

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

  const [goalsRes, mealsRes, habitsRes, entriesRes, lastWeightRes, logRes, historyRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase.from("meals").select("id, meal_type, eaten_at, planned, meal_items(*)").eq("user_id", ctx.userId).eq("log_date", date).order("created_at"),
    supabase
      .from("habits")
      .select("id, name, kind, target_value, unit, emoji, is_key, display_order")
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
      .select("mood, energy, sleep_quality, hunger, focus_note, checkin_done_at, water_ml")
      .eq("user_id", ctx.userId)
      .eq("log_date", date)
      .maybeSingle(),
    getScoreHistory(ctx),
  ]);

  const goalRow = goalsRes.data?.[0];
  if (!goalRow) return { onboarded: false } as Dashboard;

  const goals = mapGoals(goalRow);
  const meals = mapMeals((mealsRes.data ?? []) as MealRow[], timezone);
  const totals = dayTotals(meals);
  const habits = mapHabits((habitsRes.data ?? []) as HabitRow[], entriesRes.data ?? []);
  const log = logRes.data;

  // ---- Score del día (mismo cálculo que la materialización) ----
  const areas = computeAreasForDay({
    totals: { kcal: totals.kcal, protein: totals.protein },
    mealCount: meals.length,
    goals: { kcal: goals.kcal, protein: goals.protein },
    habits: habits.map((h) => ({ done: h.done })),
    sleepQuality: log?.sleep_quality ?? null,
  });
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
    weightKg: lastWeightRes.data?.[0]?.weight_kg != null ? Number(lastWeightRes.data[0].weight_kg) : null,
    mood: log?.mood ?? null,
    energy: log?.energy ?? null,
    sleepQuality: log?.sleep_quality ?? null,
    hunger: log?.hunger ?? null,
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
  goals: NutritionGoals;
  meals: Meal[];
  totals: ReturnType<typeof dayTotals>;
  waterMl: number;
}

export async function getNutritionDay(): Promise<NutritionDay | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [goalsRes, mealsRes, logRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase
      .from("meals")
      .select("id, meal_type, eaten_at, planned, photo_path, meal_items(*)")
      .eq("user_id", ctx.userId)
      .eq("log_date", ctx.today)
      .order("created_at"),
    supabase.from("daily_logs").select("water_ml").eq("user_id", ctx.userId).eq("log_date", ctx.today).maybeSingle(),
  ]);

  const goalRow = goalsRes.data?.[0];
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
    date: ctx.today,
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

export async function getHabitsDay(): Promise<{ date: string; habits: Habit[]; threshold: number } | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [habitsRes, entriesRes] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, kind, target_value, unit, emoji, is_key, display_order")
      .eq("user_id", ctx.userId)
      .eq("active", true)
      .order("display_order")
      .order("created_at"),
    supabase.from("habit_entries").select("habit_id, done, value").eq("user_id", ctx.userId).eq("log_date", ctx.today),
  ]);

  return {
    date: ctx.today,
    habits: mapHabits((habitsRes.data ?? []) as HabitRow[], entriesRes.data ?? []),
    threshold: ctx.streakThreshold,
  };
}

// ============================================================
// Progreso
// ============================================================

export interface Progress {
  date: string;
  weight: WeightPoint[];
  weightTarget: number;
  streak: number;
  calendar: CalendarDay[];
}

export async function getProgress(): Promise<Progress | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();
  const weekCells = recentDays(7, ctx.timezone);

  const [weightRes, historyRes] = await Promise.all([
    supabase
      .from("body_entries")
      .select("log_date, weight_kg")
      .eq("user_id", ctx.userId)
      .not("weight_kg", "is", null)
      .order("log_date", { ascending: false })
      .limit(400),
    getScoreHistory(ctx),
  ]);

  const weight: WeightPoint[] = (weightRes.data ?? [])
    .reverse()
    .map((w) => ({ date: w.log_date, kg: Number(w.weight_kg) }));

  const scoreByDate = new Map<string, number>();
  historyRes.forEach((r) => scoreByDate.set(r.log_date, r.total));
  const streak = computeStreak(scoreByDate, ctx.today, ctx.streakThreshold);
  const calendar: CalendarDay[] = weekCells.map((c) => ({ ...c, score: scoreByDate.get(c.date) ?? null }));

  const weightTarget =
    ctx.profile?.target_weight_kg != null
      ? Number(ctx.profile.target_weight_kg)
      : weight.length
        ? weight[weight.length - 1].kg
        : 80;

  return { date: ctx.today, weight, weightTarget, streak, calendar };
}

// ============================================================
// Shell (layout): racha, check-in del día y último peso.
// Una sola lectura para header, sidebar y las hojas de registro.
// ============================================================

export interface ShellData {
  streak: number;
  checkin: Checkin;
  lastWeightKg: number | null;
}

export async function getShellData(): Promise<ShellData | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [logRes, lastWeightRes, history] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("mood, energy, sleep_quality, hunger, focus_note, checkin_done_at, water_ml")
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
  ]);

  const scoreByDate = new Map<string, number>();
  history.forEach((r) => scoreByDate.set(r.log_date, r.total));
  const log = logRes.data;
  const lastWeightKg = lastWeightRes.data?.[0]?.weight_kg != null ? Number(lastWeightRes.data[0].weight_kg) : null;

  return {
    streak: computeStreak(scoreByDate, ctx.today, ctx.streakThreshold),
    checkin: {
      done: !!log?.checkin_done_at,
      focusNote: log?.focus_note ?? null,
      weightKg: lastWeightKg,
      mood: log?.mood ?? null,
      energy: log?.energy ?? null,
      sleepQuality: log?.sleep_quality ?? null,
      hunger: log?.hunger ?? null,
      waterMl: log?.water_ml ?? 0,
    },
    lastWeightKg,
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
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = getServerClient();

  const [goalsRes, habitsRes, lastWeightRes] = await Promise.all([
    supabase
      .from("nutrition_goals")
      .select("kcal, protein_g, carbs_g, fat_g, water_ml, mode")
      .eq("user_id", ctx.userId)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase
      .from("habits")
      .select("id, name, kind, target_value, unit, emoji, is_key, display_order")
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
  ]);

  const goalRow = goalsRes.data?.[0];
  return {
    profile: ctx.profile,
    settings: ctx.settings,
    goals: goalRow ? { ...mapGoals(goalRow), mode: goalRow.mode ?? "manual" } : null,
    habits: mapHabits((habitsRes.data ?? []) as HabitRow[], []),
    lastWeightKg: lastWeightRes.data?.[0]?.weight_kg != null ? Number(lastWeightRes.data[0].weight_kg) : null,
  };
}
