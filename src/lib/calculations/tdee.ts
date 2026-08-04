// ============================================================
// Calculadora de energía y macros (dominio puro, testeable).
// BMR: Mifflin-St Jeor · TDEE: BMR × factor de actividad ·
// Presets de objetivo + reparto de macros (P 1.6-2.2 g/kg, G 0.8-1 g/kg, C resto).
// Las salidas son ESTIMACIONES: la UI siempre las muestra editables.
// ============================================================

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type GoalPreset = "aggressive_cut" | "moderate_cut" | "maintenance" | "bulk";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentario (oficina, poco movimiento)",
  light: "Ligero (caminatas, 1-2 entrenos/sem)",
  moderate: "Moderado (3-5 entrenos/sem)",
  active: "Activo (6-7 entrenos/sem)",
  athlete: "Atleta (2 sesiones/día o trabajo físico)",
};

export const PRESET_META: Record<GoalPreset, { label: string; hint: string; adjust: number }> = {
  aggressive_cut: { label: "Déficit agresivo", hint: "~0,7-1% del peso/sem · exige adherencia", adjust: -0.22 },
  moderate_cut: { label: "Déficit moderado", hint: "~0,3-0,5% del peso/sem · sostenible (recomendado)", adjust: -0.12 },
  maintenance: { label: "Mantenimiento", hint: "Recomposición / pausa", adjust: 0 },
  bulk: { label: "Volumen", hint: "~0,25% del peso/sem en subida", adjust: 0.075 },
};

export interface CalcInputs {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  preset: GoalPreset;
}

export interface MacroPlan {
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
  warnings: string[];
}

/** BMR según Mifflin-St Jeor. */
export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

/**
 * Plan completo de macros a partir del perfil.
 * Proteína: 2.0 g/kg en déficit, 1.8 en mantenimiento, 1.7 en volumen.
 * Grasa: 0.9 g/kg (piso hormonal). Carbos: las kcal restantes / 4.
 */
export function computeMacroPlan(i: CalcInputs): MacroPlan {
  const warnings: string[] = [];
  const bmr = mifflinStJeor(i.sex, i.weightKg, i.heightCm, i.age);
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[i.activity]);
  const kcal = Math.round((tdee * (1 + PRESET_META[i.preset].adjust)) / 10) * 10;

  const proteinPerKg = i.preset === "maintenance" ? 1.8 : i.preset === "bulk" ? 1.7 : 2.0;
  const proteinG = Math.round(i.weightKg * proteinPerKg);
  const fatG = Math.round(i.weightKg * 0.9);
  const carbsKcal = kcal - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(carbsKcal / 4));

  if (kcal < bmr) warnings.push("Las calorías quedan por debajo de tu gasto basal: es un déficit muy fuerte para sostener.");
  if (carbsKcal < 0) warnings.push("El objetivo calórico es tan bajo que no entran los mínimos de proteína y grasa.");

  // Agua: ~35 ml/kg, redondeado a 250 ml.
  const waterMl = Math.round((i.weightKg * 35) / 250) * 250;

  return { bmr, tdee, kcal, proteinG, fatG, carbsG, waterMl, warnings };
}
