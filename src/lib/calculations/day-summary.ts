// ============================================================
// Lectura del día en palabras. Lo que separa un entrenador de un contador
// de calorías: no dice "1.870 de 1.950", dice si el día estuvo bien y qué
// conviene mover mañana.
//
// Reglas de tono:
//   - Nunca reta por comer un poco menos. Sí avisa cuando el déficit es
//     grande, porque no se sostiene.
//   - Una sola sugerencia por día. Cinco consejos no se leen.
//   - El cierre habla de constancia, no de perfección.
// ============================================================

import { KCAL_ZONE, type NutritionResult } from "./nutrition-score";
import { nf } from "@/lib/utils";

export interface SummaryLine {
  tone: "good" | "tip" | "warn";
  text: string;
}

export interface DaySummary {
  /** Sin comidas no hay día que leer: la card no se muestra. */
  hasData: boolean;
  /** Cumplimiento del día, el mismo número que muestra Progreso. */
  score: number;
  /** Nutrition Score: el detalle de las decisiones de comida. */
  nutritionScore: number;
  headline: string;
  lines: SummaryLine[];
  /** Cierre motivador. Habla de la racha, no del día suelto. */
  streakNote: string;
}

export interface SummaryInputs {
  nutrition: NutritionResult;
  kcal: number;
  kcalGoal: number;
  protein: number;
  proteinGoal: number;
  waterL: number;
  waterGoalL: number;
  vegetableServings: number;
  fruitServings: number;
  mealCount: number;
  streak: number;
  /** Cumplimiento del día completo (daily_scores). El score de nutrición
   *  es solo una parte: mostrarlo como "el día" no coincidía con Progreso. */
  dayTotal: number | null;
}

function headlineFor(score: number): string {
  if (score >= 90) return "Día redondo";
  if (score >= 75) return "Buen día";
  if (score >= 60) return "Día aceptable";
  return "Día para revisar";
}

/** Cómo cerró en calorías, en criollo. */
function caloriesLine(kcal: number, goal: number): SummaryLine {
  const r = goal ? kcal / goal : 0;
  if (r >= KCAL_ZONE.from && r <= KCAL_ZONE.to)
    return { tone: "good", text: `Calorías en zona (${nf(kcal)} de ${nf(goal)}). No hace falta clavar el número.` };
  if (r > 1.28) return { tone: "warn", text: `Te pasaste bastante: ${nf(kcal)} kcal. Un día no rompe nada, repetido sí.` };
  if (r > KCAL_ZONE.to) return { tone: "tip", text: `Un poco por encima (${nf(kcal)} kcal). Nada grave.` };
  if (r >= 0.82) return { tone: "good", text: `Algo por debajo (${nf(kcal)} kcal). Si no tenías hambre, está bien.` };
  if (r >= 0.67)
    return { tone: "warn", text: `Comiste poco: ${nf(kcal)} kcal. Un déficit así cuesta sostenerlo.` };
  return { tone: "warn", text: `Muy pocas calorías (${nf(kcal)} kcal). Revisá que estés llegando a la energía suficiente.` };
}

/**
 * Una sola sugerencia: la del componente más flojo que se pueda accionar
 * mañana. Si no hay nada flojo, no inventa un consejo.
 */
function tipFor(i: SummaryInputs): SummaryLine | null {
  const p = i.nutrition.parts;
  const candidates: { score: number; line: SummaryLine }[] = [];

  if (p.water.hasData && p.water.value < 90)
    candidates.push({
      score: p.water.value,
      line: { tone: "tip", text: `Mañana sumá un par de vasos: llevás ${nf(i.waterL, 1)} de ${nf(i.waterGoalL, 1)} L.` },
    });
  if (p.vegetables.hasData && p.vegetables.value < 100)
    candidates.push({
      score: p.vegetables.value,
      line: {
        tone: "tip",
        text:
          i.vegetableServings === 0
            ? "Mañana sumá verduras en el almuerzo o la cena."
            : "Mañana probá sumar una verdura más en la cena.",
      },
    });
  if (p.fruit.hasData && p.fruit.value < 100)
    candidates.push({ score: p.fruit.value, line: { tone: "tip", text: "Una fruta en la merienda cierra bien el día." } });
  if (p.protein.hasData && p.protein.value < 95)
    candidates.push({
      score: p.protein.value,
      line: {
        tone: "tip",
        text: `Te faltaron ${nf(Math.max(0, i.proteinGoal - i.protein))} g de proteína. Es lo que más cuesta completar de noche.`,
      },
    });
  if (p.quality.hasData && p.quality.value < 75)
    candidates.push({
      score: p.quality.value,
      line: { tone: "tip", text: "Buena parte de las calorías vino de ultraprocesados. Mañana, más comida real." },
    });

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].line;
}

function streakNoteFor(streak: number, score: number): string {
  if (streak <= 0)
    return score >= 75
      ? "Primer día dentro del plan. Mañana lo confirmás."
      : "Mañana arrancás de nuevo. La constancia vale más que la perfección.";
  const dias = streak === 1 ? "1 día consecutivo" : `${streak} días consecutivos`;
  return `Llevás ${dias} dentro del plan. La constancia vale más que la perfección.`;
}

export function daySummary(i: SummaryInputs): DaySummary {
  const p = i.nutrition.parts;
  const lines: SummaryLine[] = [];

  if (i.mealCount > 0) lines.push(caloriesLine(i.kcal, i.kcalGoal));

  if (p.protein.hasData && p.protein.value >= 95)
    lines.push({ tone: "good", text: `Excelente consumo de proteína (${nf(i.protein)} g).` });
  if (i.mealCount >= 3) lines.push({ tone: "good", text: "Muy buena distribución de las comidas." });
  if (i.vegetableServings > 0 && i.fruitServings > 0)
    lines.push({ tone: "good", text: "Incluiste frutas y verduras." });
  else if (i.vegetableServings > 0) lines.push({ tone: "good", text: "Incluiste verduras." });
  if (p.water.hasData && p.water.value >= 100)
    lines.push({ tone: "good", text: `Hidratación cumplida (${nf(i.waterL, 1)} L).` });
  if (p.quality.hasData && p.quality.value >= 90)
    lines.push({ tone: "good", text: "Casi todo lo que comiste fue comida real." });

  const tip = tipFor(i);
  if (tip) lines.push(tip);

  const score = i.dayTotal ?? i.nutrition.total;
  return {
    hasData: i.mealCount > 0,
    score,
    nutritionScore: i.nutrition.total,
    headline: headlineFor(score),
    lines,
    streakNote: streakNoteFor(i.streak, score),
  };
}
