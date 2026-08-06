import { Home, Utensils, Dumbbell, CalendarDays, LineChart, Settings, Briefcase, type LucideIcon } from "lucide-react";

export interface NavDef {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Secciones activas. */
export const NAV_MAIN: NavDef[] = [
  { href: "/today", label: "Hoy", Icon: Home },
  { href: "/nutrition", label: "Nutrición", Icon: Utensils },
  { href: "/activity", label: "Actividad", Icon: Dumbbell },
  { href: "/routine", label: "Rutina", Icon: CalendarDays },
];

/** Secciones completas del sidebar (desktop tiene lugar para todas). */
export const NAV_FULL: NavDef[] = [
  { href: "/today", label: "Hoy", Icon: Home },
  { href: "/nutrition", label: "Nutrición", Icon: Utensils },
  { href: "/activity", label: "Actividad", Icon: Dumbbell },
  { href: "/routine", label: "Rutina", Icon: CalendarDays },
  { href: "/work", label: "Trabajo", Icon: Briefcase },
  { href: "/progress", label: "Progreso", Icon: LineChart },
];

/** Secciones secundarias del sidebar (desktop). */
export const NAV_SECONDARY: NavDef[] = [{ href: "/settings", label: "Ajustes", Icon: Settings }];

/** Rutas que trabajan sobre un día concreto y aceptan `?d=`. */
const DATED = new Set(["/nutrition", "/activity", "/routine"]);

/**
 * Mantiene el día que se está completando al cambiar de sección.
 * Sin esto, ir de Nutrición a Actividad mientras se rellena un día viejo
 * devolvía a hoy y había que volver a buscar la fecha.
 */
export function withDay(href: string, day?: string): string {
  return day && DATED.has(href) ? `${href}?d=${day}` : href;
}
