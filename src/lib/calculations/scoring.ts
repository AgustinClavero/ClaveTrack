import type { AreaScores, ScoreWeights } from "@/types";

/** Ponderaciones iniciales (editables por el usuario). Suman 1. */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  nutrition: 0.3,
  tasks: 0.25,
  activity: 0.15,
  study: 0.1,
  habits: 0.1,
  sleep: 0.1,
};

/** Umbral de racha por defecto (%). */
export const DEFAULT_STREAK_THRESHOLD = 75;

/**
 * Cumplimiento total = Σ (puntuación_área × ponderación_área).
 * Cada puntuación va de 0 a 100; el resultado también.
 */
export function dailyScore(scores: AreaScores, weights: ScoreWeights = DEFAULT_WEIGHTS): number {
  const keys = Object.keys(weights) as (keyof ScoreWeights)[];
  const total = keys.reduce((acc, k) => acc + clamp(scores[k]) * weights[k], 0);
  return Math.round(total);
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

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}
