// ============================================================
// Lectura del peso más allá del número de hoy.
//
// El peso diario tiene mucho ruido: agua, sal, hora de la pesada. Lo que
// importa es la media móvil y la velocidad, no el valor suelto de un día.
// ============================================================

/** Días enteros entre dos fechas ISO. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

export interface WeightPoint {
  date: string;
  kg: number;
}

export interface WeightTrend {
  hasData: boolean;
  /** Última pesada registrada. */
  latest: number | null;
  /** Media móvil de los últimos 7 y 30 días (null si no hay suficientes). */
  avg7: number | null;
  avg30: number | null;
  /** Diferencia entre la media de esta semana y la de la anterior. */
  weekDelta: number | null;
  /** Ritmo real en kg por semana, calculado sobre las medias. */
  perWeek: number | null;
  direction: "baja" | "sube" | "estable";
  /** Sin cambio apreciable en tres semanas: la señal que uno quiere ver. */
  stalled: boolean;
}

/** Media de los puntos dentro de una ventana de días hacia atrás desde `to`. */
function windowAvg(series: WeightPoint[], to: string, from: number, days: number): number | null {
  const inRange = series.filter((p) => {
    const back = daysBetween(p.date, to);
    return back >= from && back < from + days;
  });
  if (inRange.length === 0) return null;
  return inRange.reduce((s, p) => s + p.kg, 0) / inRange.length;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Días mínimos de histórico para animarse a proyectar un ritmo semanal. */
const MIN_SPAN_DAYS = 10;

export function weightTrend(series: WeightPoint[]): WeightTrend {
  const empty: WeightTrend = {
    hasData: false,
    latest: null,
    avg7: null,
    avg30: null,
    weekDelta: null,
    perWeek: null,
    direction: "estable",
    stalled: false,
  };
  if (series.length === 0) return empty;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const to = last.date;

  const avg7 = windowAvg(sorted, to, 0, 7);
  const prev7 = windowAvg(sorted, to, 7, 7);
  const avg30 = windowAvg(sorted, to, 0, 30);

  const weekDelta = avg7 != null && prev7 != null ? avg7 - prev7 : null;

  // El ritmo sale de las medias. El respaldo extrapola el histórico, pero
  // solo con rango suficiente: dos pesadas de días seguidos proyectadas a la
  // semana dan números irreales (-0,4 kg en un día serían -2,8 por semana).
  const span = daysBetween(sorted[0].date, to);
  let perWeek: number | null = weekDelta;
  if (perWeek == null && sorted.length >= 3 && span >= MIN_SPAN_DAYS) {
    perWeek = ((last.kg - sorted[0].kg) / span) * 7;
  }

  const direction = perWeek == null || Math.abs(perWeek) < 0.1 ? "estable" : perWeek < 0 ? "baja" : "sube";

  // Estancamiento: tres semanas de datos y menos de 300 g de cambio.
  const threeWeeks = windowAvg(sorted, to, 14, 7);
  const stalled = avg7 != null && threeWeeks != null && Math.abs(avg7 - threeWeeks) < 0.3;

  return {
    hasData: true,
    latest: round1(last.kg),
    avg7: avg7 != null ? round1(avg7) : null,
    avg30: avg30 != null ? round1(avg30) : null,
    weekDelta: weekDelta != null ? round1(weekDelta) : null,
    perWeek: perWeek != null ? round1(perWeek) : null,
    direction,
    stalled,
  };
}
