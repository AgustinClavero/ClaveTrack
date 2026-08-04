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
  /** URL firmada de la foto (bucket privado). */
  photoUrl?: string | null;
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
  done: boolean;
  /** Progreso numérico del día (hábitos numeric/duration). */
  value: number;
  target: number | null;
  unit: string;
  emoji: string;
  isKey: boolean;
}

export interface WeightPoint {
  date: ISODate;
  kg: number;
}

/** Resultado uniforme de toda Server Action. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
