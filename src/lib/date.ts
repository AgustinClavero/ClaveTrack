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
    });
  }
  return cells;
}

function weekdayShort(dateISO: string): string {
  const wd = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" }).format(
    new Date(dateISO + "T12:00:00Z")
  );
  const clean = wd.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
