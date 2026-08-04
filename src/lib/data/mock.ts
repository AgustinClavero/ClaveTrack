// ============================================================
// Capa de datos MOCK (Fase 1 sin Supabase todavía).
// Reemplazar por repositorios reales que consulten Supabase.
// Las firmas son async a propósito, para migrar sin cambiar la UI.
// ============================================================
import type {
  AreaScores,
  BodyMeasure,
  Habit,
  Meal,
  NutritionGoals,
  WeightPoint,
} from "@/types";
import { dailyScore } from "@/lib/calculations/scoring";

export const GOALS: NutritionGoals = {
  kcal: 1950,
  protein: 140,
  carbs: 200,
  fat: 65,
  waterMl: 2500,
};

/** Objetivo de peso actual del usuario (plan hacia diciembre). */
export const WEIGHT_TARGET_KG = 80;

export const MEALS: Meal[] = [
  {
    id: "m1",
    type: "desayuno",
    time: "08:10",
    planned: false,
    emoji: "🥣",
    items: [
      { id: "i1", foodId: "f1", foodName: "Avena", quantity: 60, base: "100g", macros: { kcal: 228, protein: 8, carbs: 40, fat: 4 } },
      { id: "i2", foodId: "f2", foodName: "Banana", quantity: 1, base: "unidad", macros: { kcal: 105, protein: 1, carbs: 27, fat: 0 } },
      { id: "i3", foodId: "f3", foodName: "Leche descremada", quantity: 200, base: "100ml", macros: { kcal: 77, protein: 7, carbs: 10, fat: 0 } },
    ],
  },
  {
    id: "m2",
    type: "almuerzo",
    time: "13:20",
    planned: true,
    emoji: "🍗",
    items: [
      { id: "i4", foodId: "f4", foodName: "Pechuga de pollo", quantity: 150, base: "100g", macros: { kcal: 248, protein: 46, carbs: 0, fat: 5 } },
      { id: "i5", foodId: "f5", foodName: "Arroz integral", quantity: 120, base: "100g", macros: { kcal: 154, protein: 3, carbs: 33, fat: 1 } },
      { id: "i6", foodId: "f6", foodName: "Ensalada mixta", quantity: 1, base: "unidad", macros: { kcal: 90, protein: 2, carbs: 8, fat: 6 } },
    ],
  },
  {
    id: "m3",
    type: "merienda",
    time: "17:30",
    planned: true,
    emoji: "🥜",
    items: [
      { id: "i7", foodId: "f7", foodName: "Yogur griego", quantity: 170, base: "100g", macros: { kcal: 150, protein: 15, carbs: 6, fat: 8 } },
      { id: "i8", foodId: "f8", foodName: "Frutos secos", quantity: 30, base: "100g", macros: { kcal: 180, protein: 6, carbs: 6, fat: 16 } },
    ],
  },
];

export const HABITS: Habit[] = [
  { id: "h1", name: "Beber agua", kind: "numeric", meta: "1,4 / 2,5 L", done: true },
  { id: "h2", name: "Registrar comidas", kind: "boolean", meta: "diario", done: true },
  { id: "h3", name: "Tomar suplementos", kind: "boolean", meta: "diario", done: true },
  { id: "h4", name: "Planificar el día", kind: "boolean", meta: "diario", done: true },
  { id: "h5", name: "Leer", kind: "duration", meta: "0 / 20 min", done: false },
  { id: "h6", name: "Caminar", kind: "numeric", meta: "5.240 / 8.000", done: false },
  { id: "h7", name: "Entrenar", kind: "weekly", meta: "3 / 4 semanal", done: false },
  { id: "h8", name: "Dormir 7 h", kind: "numeric", meta: "anoche 6,5 h", done: false },
];

export const WEIGHT_SERIES: WeightPoint[] = [
  { date: "2026-06-08", kg: 85.5 },
  { date: "2026-06-22", kg: 84.9 },
  { date: "2026-07-06", kg: 84.2 },
  { date: "2026-07-20", kg: 83.6 },
  { date: "2026-08-03", kg: 82.7 },
  { date: "2026-08-04", kg: 82.4 },
];

export const MEASURES: BodyMeasure[] = [
  { label: "Cintura", cm: 88, deltaCm: -1.5 },
  { label: "Pecho", cm: 102, deltaCm: -0.5 },
  { label: "Cadera", cm: 98, deltaCm: -1.0 },
  { label: "Brazo", cm: 36, deltaCm: 0 },
];

/** Puntuaciones de cada área de hoy (mock). */
export const AREA_SCORES: AreaScores = {
  nutrition: 82,
  tasks: 71,
  activity: 100,
  study: 60,
  habits: 75,
  sleep: 80,
};

export const STREAK_DAYS = 5;

// --- API async simulada (mismo shape que tendrán los repositorios) ---
export async function getToday() {
  const score = dailyScore(AREA_SCORES);
  return {
    goals: GOALS,
    meals: MEALS,
    habits: HABITS,
    weight: WEIGHT_SERIES,
    measures: MEASURES,
    score,
    streak: STREAK_DAYS,
    weightTarget: WEIGHT_TARGET_KG,
  };
}
