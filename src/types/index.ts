// ============================================================
// Tipos de dominio de ClaveTrack (Fase 1 — MVP)
// ============================================================

export type UUID = string;
export type ISODate = string; // yyyy-mm-dd

/** Base de referencia sobre la que un alimento declara sus macros. */
export type FoodBase = "100g" | "100ml" | "unidad";

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
}

/** Alimento del catálogo: macros por unidad de referencia. */
export interface Food {
  id: UUID;
  name: string;
  base: FoodBase;
  macros: Macros;
}

/** Ítem de una comida: alimento + cantidad. Guarda snapshot de macros. */
export interface MealItem {
  id: UUID;
  foodId: UUID;
  foodName: string;
  quantity: number; // en la unidad de base del alimento
  base: FoodBase;
  macros: Macros; // snapshot calculado al registrar
}

export type MealType = "desayuno" | "almuerzo" | "merienda" | "cena" | "colacion" | "bebida";

export interface Meal {
  id: UUID;
  type: MealType;
  time?: string; // HH:mm
  planned: boolean;
  emoji?: string;
  items: MealItem[];
}

export interface NutritionGoals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

export type HabitKind = "boolean" | "numeric" | "duration" | "weekly";

export interface Habit {
  id: UUID;
  name: string;
  kind: HabitKind;
  meta?: string; // texto de progreso, ej. "1,4 / 2,5 L"
  done: boolean;
}

export interface WeightPoint {
  date: ISODate;
  kg: number;
}

export interface BodyMeasure {
  label: string;
  cm: number;
  deltaCm: number;
}

/** Pesos de las áreas para el cálculo de cumplimiento (0..1). */
export interface ScoreWeights {
  nutrition: number;
  tasks: number;
  activity: number;
  study: number;
  habits: number;
  sleep: number;
}

/** Puntuación por área (0..100). */
export type AreaScores = Record<keyof ScoreWeights, number>;
