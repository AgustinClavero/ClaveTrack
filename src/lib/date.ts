// Utilidades de fecha centradas en la timezone del usuario.
// El "día" de ClaveTrack se calcula SIEMPRE en la tz del usuario, no en UTC.

export const DEFAULT_TZ = "America/Argentina/Buenos_Aires";

/** Fecha de "hoy" (YYYY-MM-DD) en la timezone del usuario. */
export function userToday(timeZone: string = DEFAULT_TZ): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD sumando (o restando) días a una fecha base. */
export function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface DayCell {
  date: string;
  weekday: string; // "Lun", "Mar"...
  dayNum: number;
  isToday: boolean;
  monthShort: string; // "Ago", "Sep"...
  isFuture: boolean;
}

/** Devuelve los últimos `count` días (terminando hoy) para el calendario. */
export function recentDays(count: number, timeZone: string = DEFAULT_TZ): DayCell[] {
  const today = userToday(timeZone);
  const cells: DayCell[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    cells.push({
      date,
      weekday: weekdayShort(date),
      dayNum: Number(date.slice(8, 10)),
      isToday: date === today,
      monthShort: monthShort(date),
      isFuture: date > today,
    });
  }
  return cells;
}

/**
 * Ventana de días alrededor de hoy para el calendario deslizable:
 * cruza el mes anterior y el siguiente sin cortar en el borde de mes.
 */
export function dayWindow(before: number, after: number, timeZone: string = DEFAULT_TZ): DayCell[] {
  const today = userToday(timeZone);
  const cells: DayCell[] = [];
  for (let i = -before; i <= after; i++) {
    const date = addDays(today, i);
    cells.push({
      date,
      weekday: weekdayShort(date),
      dayNum: Number(date.slice(8, 10)),
      isToday: date === today,
      monthShort: monthShort(date),
      isFuture: date > today,
    });
  }
  return cells;
}

function monthShort(dateISO: string): string {
  const m = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(
    new Date(dateISO + "T12:00:00Z")
  );
  const clean = m.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function weekdayShort(dateISO: string): string {
  const wd = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" }).format(
    new Date(dateISO + "T12:00:00Z")
  );
  const clean = wd.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export interface MonthCell extends DayCell {
  /** false cuando la celda pertenece al mes anterior o siguiente. */
  inMonth: boolean;
}

/**
 * Grilla de un mes completa, alineada de lunes a domingo.
 * Devuelve siempre semanas enteras: las puntas traen días del mes vecino.
 */
export function monthGrid(monthISO: string, timeZone: string = DEFAULT_TZ): MonthCell[] {
  const today = userToday(timeZone);
  const year = Number(monthISO.slice(0, 4));
  const month = Number(monthISO.slice(5, 7));

  const first = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay(): 0 = domingo. Se desplaza para que la semana arranque el lunes.
  const lead = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - lead);

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      weekday: weekdayShort(iso),
      dayNum: d.getUTCDate(),
      isToday: iso === today,
      monthShort: monthShortOf(iso),
      isFuture: iso > today,
      inMonth: d.getUTCMonth() === month - 1,
    });
    // Corta al completar la última semana que contiene días del mes.
    if (i >= 27 && (i + 1) % 7 === 0 && d.getUTCMonth() !== month - 1) break;
  }
  return cells;
}

function monthShortOf(dateISO: string): string {
  const m = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(
    new Date(dateISO + "T12:00:00Z")
  );
  const clean = m.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Nombre largo del mes: "Agosto 2026". */
export function monthLabel(monthISO: string): string {
  const l = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(monthISO + "-01T12:00:00Z")
  );
  return l.charAt(0).toUpperCase() + l.slice(1);
}

/** Suma meses a un "YYYY-MM". */
export function addMonths(monthISO: string, delta: number): string {
  const y = Number(monthISO.slice(0, 4));
  const m = Number(monthISO.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 7);
}
