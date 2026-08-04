// ============================================================
// Motor de cumplimiento de ClaveTrack.
// Cada área aporta un puntaje 0..100 y un flag hasData.
// El total renormaliza los pesos sobre las áreas con datos:
// nunca penaliza por un área que el usuario no usa o que aún no tiene datos.
// ============================================================

export type AreaKey = "nutrition" | "activity" | "focus" | "study" | "habits" | "rest";

export const AREA_LABELS: Record<AreaKey, string> = {
  nutrition: "Nutrición",
  activity: "Actividad",
  focus: "Foco",
  study: "Estudio",
  habits: "Hábitos",
  rest: "Descanso",
};

/** Pesos iniciales (editables por el usuario). No hace falta que sumen 100: se normalizan. */
export const DEFAULT_WEIGHTS: Record<AreaKey, number> = {
  nutrition: 30,
  focus: 25,
  activity: 15,
  study: 10,
  habits: 10,
  rest: 10,
};

export const DEFAULT_STREAK_THRESHOLD = 75;

export interface AreaResult {
  value: number; // 0..100
  hasData: boolean;
}

export interface DayScore {
  total: number; // 0..100
  breakdown: Record<AreaKey, number>; // -1 = sin datos
  activeAreas: AreaKey[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Cumplimiento del día: Σ (score_área × peso_normalizado) sobre áreas con datos. */
export function computeDay(
  areas: Partial<Record<AreaKey, AreaResult>>,
  weights: Record<AreaKey, number> = DEFAULT_WEIGHTS
): DayScore {
  const keys = Object.keys(weights) as AreaKey[];
  const active = keys.filter((k) => areas[k]?.hasData);
  const totalW = active.reduce((s, k) => s + weights[k], 0) || 1;

  const total = Math.round(
    active.reduce((s, k) => s + clamp(areas[k]!.value) * (weights[k] / totalW), 0)
  );

  const breakdown = {} as Record<AreaKey, number>;
  keys.forEach((k) => {
    breakdown[k] = areas[k]?.hasData ? Math.round(clamp(areas[k]!.value)) : -1;
  });

  return { total, breakdown, activeAreas: active };
}

export type ScoreLabel = "Excelente" | "Buen día" | "Aceptable" | "Revisar";

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Buen día";
  if (score >= 60) return "Aceptable";
  return "Revisar";
}

export function meetsStreak(score: number, threshold = DEFAULT_STREAK_THRESHOLD): boolean {
  return score >= threshold;
}

// ---------- Gamificación (provisional hasta materializar daily_scores) ----------
const XP_PER_LEVEL = 500;

/** XP acumulado aproximado a partir de la racha (placeholder hasta tener histórico). */
export function estimateXp(streak: number, todayScore: number): number {
  return streak * 100 + Math.round(todayScore);
}

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const inLevel = xp % XP_PER_LEVEL;
  return { level, inLevel, per: XP_PER_LEVEL };
}
