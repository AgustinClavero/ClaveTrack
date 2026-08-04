// ============================================================
// Gasto calórico de la actividad (dominio puro).
// Fórmula MET: kcal = MET × peso_kg × horas.
// Los METs salen del Compendium of Physical Activities (Ainsworth).
// Es una ESTIMACIÓN: la UI lo dice y el valor queda editable.
// ============================================================

export type WorkoutKind =
  | "caminata"
  | "running"
  | "gimnasio"
  | "ciclismo"
  | "futbol"
  | "natacion"
  | "boxeo"
  | "yoga"
  | "otro";

export type Intensity = "suave" | "moderada" | "fuerte";

export interface WorkoutDef {
  kind: WorkoutKind;
  label: string;
  emoji: string;
  /** MET por intensidad. */
  met: Record<Intensity, number>;
  /** Pide distancia además de minutos. */
  tracksDistance?: boolean;
  /** Pide pasos. */
  tracksSteps?: boolean;
}

export const WORKOUTS: WorkoutDef[] = [
  {
    kind: "caminata",
    label: "Caminata",
    emoji: "🚶",
    met: { suave: 2.8, moderada: 3.5, fuerte: 5.0 },
    tracksDistance: true,
    tracksSteps: true,
  },
  { kind: "running", label: "Running", emoji: "🏃", met: { suave: 7.0, moderada: 9.0, fuerte: 11.5 }, tracksDistance: true },
  { kind: "gimnasio", label: "Gimnasio", emoji: "🏋️", met: { suave: 3.5, moderada: 5.0, fuerte: 6.5 } },
  { kind: "ciclismo", label: "Bici", emoji: "🚴", met: { suave: 4.0, moderada: 7.5, fuerte: 10.0 }, tracksDistance: true },
  { kind: "futbol", label: "Fútbol", emoji: "⚽", met: { suave: 5.0, moderada: 7.0, fuerte: 10.0 } },
  { kind: "natacion", label: "Natación", emoji: "🏊", met: { suave: 5.0, moderada: 7.0, fuerte: 9.8 }, tracksDistance: true },
  { kind: "boxeo", label: "Boxeo", emoji: "🥊", met: { suave: 5.5, moderada: 7.8, fuerte: 12.0 } },
  { kind: "yoga", label: "Yoga / movilidad", emoji: "🧘", met: { suave: 2.0, moderada: 2.5, fuerte: 4.0 } },
  { kind: "otro", label: "Otra", emoji: "✨", met: { suave: 3.0, moderada: 4.5, fuerte: 6.0 } },
];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  suave: "Suave",
  moderada: "Moderada",
  fuerte: "Fuerte",
};

export const workoutDef = (kind: WorkoutKind) => WORKOUTS.find((w) => w.kind === kind) ?? WORKOUTS[WORKOUTS.length - 1];

/** Largo de zancada estimado a partir de la altura (0.415 × altura). */
export function strideMeters(heightCm: number | null): number {
  return heightCm ? (heightCm * 0.415) / 100 : 0.72;
}

/** Distancia recorrida por una cantidad de pasos. */
export function stepsToKm(steps: number, heightCm: number | null): number {
  return (steps * strideMeters(heightCm)) / 1000;
}

/**
 * Minutos equivalentes de caminata para una cantidad de pasos.
 * Asume una cadencia de ~100 pasos/min (caminata normal).
 */
export function stepsToMinutes(steps: number): number {
  return steps / 100;
}

export interface BurnInput {
  kind: WorkoutKind;
  minutes: number;
  intensity: Intensity;
  weightKg: number;
}

/** Calorías quemadas estimadas. Devuelve 0 si falta el peso. */
export function burnedKcal({ kind, minutes, intensity, weightKg }: BurnInput): number {
  if (!weightKg || minutes <= 0) return 0;
  const met = workoutDef(kind).met[intensity];
  return Math.round(met * weightKg * (minutes / 60));
}

/** Calorías de una jornada de pasos (se computa como caminata moderada). */
export function stepsKcal(steps: number, weightKg: number): number {
  if (!steps || !weightKg) return 0;
  return burnedKcal({ kind: "caminata", minutes: stepsToMinutes(steps), intensity: "moderada", weightKg });
}
