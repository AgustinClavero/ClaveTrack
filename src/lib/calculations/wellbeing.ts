// ============================================================
// Índice de bienestar: cómo llegás al día.
//
// No lo carga el usuario, se deriva del check-in. La idea es que el check-in
// deje de ser un formulario que no hace nada y pase a ser el punto de partida
// para decidir cómo encarar el día.
//
// Dos criterios:
//   - El hambre y el estrés se invierten: 1 es bueno, 10 es malo.
//   - Las horas dormidas pesan aparte de la calidad, porque no es lo mismo
//     9 horas con calidad 6 que 4 horas con calidad 9.
// ============================================================

export type WellbeingLevel = "excelente" | "bueno" | "justo" | "bajo";

export interface WellbeingInput {
  mood: number | null;
  energy: number | null;
  sleepQuality: number | null;
  hunger: number | null;
  stress?: number | null;
  sleepHours?: number | null;
}

export interface WellbeingPart {
  key: string;
  label: string;
  emoji: string;
  /** Valor tal como lo cargó el usuario (1..10 o horas). */
  raw: number;
  /** Aporte normalizado 0..100. */
  score: number;
}

export interface Wellbeing {
  hasData: boolean;
  /** 0..100. */
  index: number;
  level: WellbeingLevel;
  label: string;
  parts: WellbeingPart[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Horas dormidas → puntaje. La zona buena es 7–9 h; por debajo cae rápido,
 * por encima baja apenas (dormir de más no es un problema comparable).
 */
export function sleepHoursScore(h: number): number {
  if (h >= 7 && h <= 9) return 100;
  if (h > 9) return h <= 10 ? 90 : 80;
  if (h >= 6.5) return 85;
  if (h >= 6) return 70;
  if (h >= 5) return 50;
  return 30;
}

/** Cuánto pesa cada señal. Se renormaliza sobre las que tienen dato. */
const WEIGHTS: Record<string, number> = {
  energy: 25,
  sleepHours: 20,
  mood: 20,
  sleepQuality: 15,
  hunger: 10,
  stress: 10,
};

function levelFor(index: number): { level: WellbeingLevel; label: string } {
  if (index >= 85) return { level: "excelente", label: "Excelente" };
  if (index >= 70) return { level: "bueno", label: "Buen día" };
  if (index >= 50) return { level: "justo", label: "Justo" };
  return { level: "bajo", label: "Día flojo" };
}

export function wellbeing(i: WellbeingInput): Wellbeing {
  const parts: WellbeingPart[] = [];
  const add = (key: string, label: string, emoji: string, raw: number | null | undefined, score: number) => {
    if (raw == null) return;
    parts.push({ key, label, emoji, raw, score: clamp(score) });
  };

  add("mood", "Ánimo", "😊", i.mood, (i.mood ?? 0) * 10);
  add("energy", "Energía", "⚡", i.energy, (i.energy ?? 0) * 10);
  add("sleepQuality", "Sueño", "😴", i.sleepQuality, (i.sleepQuality ?? 0) * 10);
  // Invertidos: menos hambre y menos estrés es mejor.
  add("hunger", "Hambre", "🍔", i.hunger, (11 - (i.hunger ?? 0)) * 10);
  add("stress", "Estrés", "😰", i.stress, (11 - (i.stress ?? 0)) * 10);
  if (i.sleepHours != null && i.sleepHours > 0) {
    parts.push({ key: "sleepHours", label: "Horas", emoji: "🛏", raw: i.sleepHours, score: sleepHoursScore(i.sleepHours) });
  }

  if (parts.length === 0) {
    return { hasData: false, index: 0, level: "justo", label: "Sin check-in", parts: [] };
  }

  const totalW = parts.reduce((s, p) => s + (WEIGHTS[p.key] ?? 10), 0) || 1;
  const index = Math.round(parts.reduce((s, p) => s + p.score * ((WEIGHTS[p.key] ?? 10) / totalW), 0));
  const { level, label } = levelFor(index);
  return { hasData: true, index, level, label, parts };
}

/**
 * Qué conviene hacer hoy según cómo llegaste. No es un diagnóstico: es una
 * sugerencia de carga, que es lo que uno decide a la mañana.
 */
export function dayAdvice(w: Wellbeing): string | null {
  if (!w.hasData) return null;
  const energy = w.parts.find((p) => p.key === "energy")?.raw ?? null;
  const stress = w.parts.find((p) => p.key === "stress")?.raw ?? null;

  if (energy != null && energy <= 4)
    return "Día de baja carga: caminata suave, tareas simples y dejar lo pesado para mañana.";
  if (stress != null && stress >= 8)
    return "Estrés alto: bajá el volumen del día y priorizá una sola cosa importante.";
  if (w.index >= 85) return "Día para lo difícil: entrená fuerte y avanzá el proyecto que venís postergando.";
  if (w.index >= 70) return "Buen día para sostener el plan sin exigirte de más.";
  return "Arrancá por lo simple y ganá impulso: una tarea corta y algo de movimiento.";
}
