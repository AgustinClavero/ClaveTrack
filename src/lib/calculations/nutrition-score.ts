// ============================================================
// Nutrition Score: puntúa DECISIONES, no exactitud aritmética.
//
// Dos ideas que lo separan de un contador de calorías:
//   1. Zonas, no una línea. Cerrar en 1.870 o en 2.010 con objetivo 1.950
//      es lo mismo: ambos están bien. Nadie debería comer de más para
//      alcanzar un número.
//   2. Asimetría. Quedarse corto un día es aceptable; pasarse mucho, no.
//      Por eso las bandas por debajo caen más suave que las de arriba.
//
// Todo es puro y relativo al objetivo del usuario: las bandas se expresan
// como fracción de su meta, no en kcal fijas.
// ============================================================

/** Puntaje de un componente. `hasData` false = no entra en el promedio. */
export interface Part {
  value: number; // 0..100
  hasData: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Primera banda cuyo umbral alcanza la razón. Las bandas van de mayor a menor. */
function band(ratio: number, bands: [min: number, score: number][]): number {
  for (const [min, score] of bands) if (ratio >= min) return score;
  return bands[bands.length - 1][1];
}

// ---------- Calorías ----------
// Zona óptima ancha (92%–105% del objetivo). Por debajo baja de a poco;
// por arriba cae más rápido, que es donde está el riesgo real.
export const KCAL_ZONE = { from: 0.92, to: 1.05 };

export function caloriesScore(kcal: number, goal: number): Part {
  if (!goal || kcal <= 0) return { value: 0, hasData: false };
  const r = kcal / goal;
  if (r >= KCAL_ZONE.from && r <= KCAL_ZONE.to) return { value: 100, hasData: true };
  if (r > KCAL_ZONE.to) {
    // Exceso: leve, moderado, alto.
    const v = r <= 1.15 ? 80 : r <= 1.28 ? 60 : 20;
    return { value: v, hasData: true };
  }
  // Por debajo: un poco corto, muy corto, insuficiente.
  const v = band(r, [
    [0.82, 90],
    [0.67, 70],
    [0, 40],
  ]);
  return { value: v, hasData: true };
}

// ---------- Proteína ----------
// El cuerpo no distingue 139 g de 140 g: los tramos lo reflejan.
export function proteinScore(g: number, goal: number): Part {
  if (!goal) return { value: 0, hasData: false };
  const r = g / goal;
  return {
    value: band(r, [
      [1, 100],
      [0.93, 95],
      [0.855, 85],
      [0.71, 70],
      [0, 40],
    ]),
    hasData: true,
  };
}

// ---------- Agua ----------
// 2,3 de 2,5 L es un día excelente, no un incumplimiento.
export function waterScore(liters: number, goalLiters: number): Part {
  if (!goalLiters) return { value: 0, hasData: false };
  const r = liters / goalLiters;
  return {
    value: band(r, [
      // 0.9 y no 0.92: 2,3 de 2,5 L da 0,9199… en binario y caía una banda.
      [0.9, 100],
      [0.8, 90],
      [0.6, 70],
      [0.35, 50],
      [0, 25],
    ]),
    hasData: true,
  };
}

// ---------- Presencia de grupos ----------
/** Verduras: una porción ya suma; dos o más es el día completo. */
export function vegetableScore(servings: number, hasMeals: boolean): Part {
  if (!hasMeals) return { value: 0, hasData: false };
  return { value: servings >= 2 ? 100 : servings === 1 ? 80 : 40, hasData: true };
}

/** Fruta: alcanza con haber comido una. */
export function fruitScore(servings: number, hasMeals: boolean): Part {
  if (!hasMeals) return { value: 0, hasData: false };
  return { value: servings >= 1 ? 100 : 50, hasData: true };
}

/**
 * Calidad: qué proporción de las calorías vino de comida real.
 * Sin ítems marcados como ultraprocesados no hay nada que juzgar.
 */
export function qualityScore(processedKcal: number, totalKcal: number): Part {
  if (totalKcal <= 0) return { value: 0, hasData: false };
  const share = processedKcal / totalKcal;
  return {
    value: band(1 - share, [
      [0.9, 100],
      [0.8, 90],
      [0.65, 75],
      [0.5, 55],
      [0, 30],
    ]),
    hasData: true,
  };
}

// ---------- Score compuesto ----------
export type NutritionPartKey = "calories" | "protein" | "vegetables" | "fruit" | "water" | "quality";

/** Cuánto pesa cada decisión. Se renormaliza sobre las que tienen dato. */
export const NUTRITION_WEIGHTS: Record<NutritionPartKey, number> = {
  calories: 30,
  protein: 30,
  vegetables: 12,
  fruit: 8,
  water: 10,
  quality: 10,
};

export interface NutritionInputs {
  kcal: number;
  kcalGoal: number;
  protein: number;
  proteinGoal: number;
  waterL: number;
  waterGoalL: number;
  vegetableServings: number;
  fruitServings: number;
  processedKcal: number;
  mealCount: number;
}

export interface NutritionResult {
  total: number;
  parts: Record<NutritionPartKey, Part>;
}

export function nutritionScore(i: NutritionInputs): NutritionResult {
  const hasMeals = i.mealCount > 0;
  const parts: Record<NutritionPartKey, Part> = {
    calories: caloriesScore(i.kcal, i.kcalGoal),
    protein: hasMeals ? proteinScore(i.protein, i.proteinGoal) : { value: 0, hasData: false },
    vegetables: vegetableScore(i.vegetableServings, hasMeals),
    fruit: fruitScore(i.fruitServings, hasMeals),
    water: waterScore(i.waterL, i.waterGoalL),
    quality: qualityScore(i.processedKcal, i.kcal),
  };

  const keys = Object.keys(NUTRITION_WEIGHTS) as NutritionPartKey[];
  const active = keys.filter((k) => parts[k].hasData);
  const totalW = active.reduce((s, k) => s + NUTRITION_WEIGHTS[k], 0) || 1;
  const total = Math.round(active.reduce((s, k) => s + clamp(parts[k].value) * (NUTRITION_WEIGHTS[k] / totalW), 0));

  return { total, parts };
}

export const NUTRITION_PART_LABELS: Record<NutritionPartKey, string> = {
  calories: "Calorías",
  protein: "Proteína",
  vegetables: "Verduras",
  fruit: "Fruta",
  water: "Agua",
  quality: "Calidad",
};

export const NUTRITION_PART_EMOJI: Record<NutritionPartKey, string> = {
  calories: "🔥",
  protein: "🍗",
  vegetables: "🥗",
  fruit: "🍎",
  water: "💧",
  quality: "🌱",
};
