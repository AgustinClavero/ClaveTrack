// ============================================================
// Motor de hitos, logros y recomendaciones (dominio puro).
// Regla de producto: acompañar, no sermonear. Cada recomendación
// dice qué hacer concretamente, nunca juzga el día.
// ============================================================

import type { AreaKey } from "./scoring";

export type Tone = "good" | "warn" | "neutral";

export interface Insight {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  tone: Tone;
  /** Ruta a la que lleva la acción sugerida. */
  href?: string;
  cta?: string;
}

export interface Milestone {
  id: string;
  emoji: string;
  label: string;
  /** 0..1 */
  progress: number;
  current: number;
  target: number;
  unit: string;
  done: boolean;
}

// ---------- Logros (se desbloquean y quedan) ----------

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  hint: string;
  unlocked: boolean;
  /** 0..1 para los que aún no se desbloquearon. */
  progress: number;
}

export interface AchievementInputs {
  streak: number;
  bestStreak: number;
  daysLogged: number;
  totalMeals: number;
  perfectDays: number;
  weightLogged: number;
}

const ACH_DEFS: {
  id: string;
  emoji: string;
  name: string;
  hint: string;
  target: number;
  pick: (i: AchievementInputs) => number;
}[] = [
  { id: "first-day", emoji: "🌱", name: "Primer día", hint: "Registrá tu primer día", target: 1, pick: (i) => i.daysLogged },
  { id: "streak-3", emoji: "🔥", name: "Tres seguidos", hint: "3 días de racha", target: 3, pick: (i) => i.bestStreak },
  { id: "streak-7", emoji: "⚡", name: "Semana completa", hint: "7 días de racha", target: 7, pick: (i) => i.bestStreak },
  { id: "streak-30", emoji: "🏆", name: "Mes de constancia", hint: "30 días de racha", target: 30, pick: (i) => i.bestStreak },
  { id: "meals-25", emoji: "🍽", name: "Cocinero", hint: "25 comidas registradas", target: 25, pick: (i) => i.totalMeals },
  { id: "perfect-5", emoji: "💎", name: "Cinco perfectos", hint: "5 días al 100%", target: 5, pick: (i) => i.perfectDays },
  { id: "weight-10", emoji: "⚖️", name: "Seguimiento fino", hint: "10 pesajes registrados", target: 10, pick: (i) => i.weightLogged },
  { id: "days-30", emoji: "📅", name: "Un mes adentro", hint: "30 días con registro", target: 30, pick: (i) => i.daysLogged },
];

export function computeAchievements(i: AchievementInputs): Achievement[] {
  return ACH_DEFS.map((d) => {
    const v = d.pick(i);
    return {
      id: d.id,
      emoji: d.emoji,
      name: d.name,
      hint: d.hint,
      unlocked: v >= d.target,
      progress: Math.max(0, Math.min(1, v / d.target)),
    };
  });
}

// ---------- Hitos de peso ----------

export function weightMilestones(
  start: number,
  current: number,
  target: number
): Milestone[] {
  if (!start || !current || !target || start === target) return [];
  const losing = target < start;
  const totalDelta = Math.abs(start - target);
  const doneDelta = losing ? Math.max(0, start - current) : Math.max(0, current - start);

  // Cuartos del camino: hitos concretos, no un porcentaje suelto.
  return [0.25, 0.5, 0.75, 1].map((q) => {
    const need = totalDelta * q;
    const kg = losing ? start - need : start + need;
    return {
      id: `w-${q}`,
      emoji: q === 1 ? "🏁" : "📍",
      label: q === 1 ? `Meta: ${kg.toFixed(1)} kg` : `${Math.round(q * 100)}% · ${kg.toFixed(1)} kg`,
      progress: Math.max(0, Math.min(1, doneDelta / need)),
      current: doneDelta,
      target: need,
      unit: "kg",
      done: doneDelta >= need,
    };
  });
}

/**
 * Ritmo real vs. esperado para llegar a la meta en la fecha objetivo.
 * Devuelve null si no hay datos suficientes.
 */
export interface PaceReport {
  perWeek: number;
  neededPerWeek: number | null;
  onTrack: boolean | null;
  weeksLeft: number | null;
  projectedDate: string | null;
}

export function weightPace(
  series: { date: string; kg: number }[],
  target: number,
  deadlineISO?: string | null
): PaceReport | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const days = Math.max(1, daysBetween(first.date, last.date));
  const perWeek = ((last.kg - first.kg) / days) * 7;

  const remaining = target - last.kg;
  let neededPerWeek: number | null = null;
  let weeksLeft: number | null = null;
  if (deadlineISO) {
    const d = daysBetween(last.date, deadlineISO);
    if (d > 0) {
      weeksLeft = d / 7;
      neededPerWeek = remaining / weeksLeft;
    }
  }

  // Proyección: a este ritmo, ¿cuándo se llega?
  let projectedDate: string | null = null;
  if (Math.abs(perWeek) > 0.01 && Math.sign(perWeek) === Math.sign(remaining)) {
    const weeks = remaining / perWeek;
    if (weeks > 0 && weeks < 520) projectedDate = addDaysISO(last.date, Math.round(weeks * 7));
  }

  const onTrack =
    neededPerWeek == null ? null : Math.abs(perWeek) >= Math.abs(neededPerWeek) * 0.85 && Math.sign(perWeek) === Math.sign(neededPerWeek);

  return { perWeek, neededPerWeek, onTrack, weeksLeft, projectedDate };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------- Recomendaciones del día ----------

export interface DayInsightInputs {
  score: number;
  breakdown: Record<AreaKey, number>;
  kcal: number;
  kcalGoal: number;
  protein: number;
  proteinGoal: number;
  mealsCount: number;
  pendingHabits: { name: string; emoji: string }[];
  waterMl: number;
  waterGoalMl: number;
  checkinDone: boolean;
  streak: number;
  hour: number;
}

/** Un decimal con coma (es-AR) sin depender de Intl en dominio puro. */
const dec = (n: number) => n.toFixed(1).replace(".", ",");

/** Devuelve hasta 3 sugerencias accionables, ordenadas por impacto. */
export function dayInsights(i: DayInsightInputs): Insight[] {
  const out: Insight[] = [];

  if (!i.checkinDone) {
    out.push({
      id: "checkin",
      emoji: "📋",
      title: "Hacé tu check-in",
      detail: "Un minuto: peso, ánimo, sueño y tu foco del día.",
      tone: "neutral",
      cta: "Abrir check-in",
    });
  }

  if (i.mealsCount === 0 && i.hour >= 11) {
    out.push({
      id: "no-meals",
      emoji: "🍽",
      title: "Todavía no registraste comidas",
      detail: "Nutrición pesa mucho en tu día: cargá lo que comiste hasta ahora.",
      tone: "warn",
      href: "/nutrition",
      cta: "Registrar comida",
    });
  } else if (i.kcalGoal > 0) {
    const left = i.kcalGoal - i.kcal;
    const proteinLeft = i.proteinGoal - i.protein;
    if (proteinLeft > 25 && i.hour >= 15) {
      out.push({
        id: "protein",
        emoji: "🍗",
        title: `Te faltan ${Math.round(proteinLeft)} g de proteína`,
        detail: "Es lo que más cuesta completar de noche. Pensá la cena con eso en mente.",
        tone: "warn",
        href: "/nutrition",
        cta: "Ver nutrición",
      });
    } else if (left < -100) {
      out.push({
        id: "over",
        emoji: "📊",
        title: `Pasaste tu objetivo por ${Math.round(-left)} kcal`,
        detail: "Un día no define nada. Mañana seguís con tu plan.",
        tone: "neutral",
      });
    }
  }

  if (i.waterGoalMl > 0 && i.waterMl < i.waterGoalMl * 0.5 && i.hour >= 14) {
    out.push({
      id: "water",
      emoji: "💧",
      title: "Vas corto de agua",
      detail: `Llevás ${dec(i.waterMl / 1000)} de ${dec(i.waterGoalMl / 1000)} L.`,
      tone: "warn",
      href: "/nutrition",
      cta: "Sumar un vaso",
    });
  }

  if (i.pendingHabits.length > 0 && i.pendingHabits.length <= 2) {
    const names = i.pendingHabits.map((h) => h.name).join(" y ");
    out.push({
      id: "habits-close",
      emoji: "✅",
      title: `Te falta poco: ${names}`,
      detail: "Marcalos y cerrás el día completo.",
      tone: "neutral",
      href: "/habits",
      cta: "Ir a hábitos",
    });
  }

  if (i.streak >= 3 && i.score >= 75) {
    out.push({
      id: "streak-alive",
      emoji: "🔥",
      title: `Racha de ${i.streak} días en pie`,
      detail: "Hoy ya superaste el umbral. Seguí así.",
      tone: "good",
    });
  }

  return out.slice(0, 3);
}
