import { Home, Utensils, Dumbbell, CalendarDays, LineChart, Settings, type LucideIcon } from "lucide-react";

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
  { href: "/progress", label: "Progreso", Icon: LineChart },
];

/** Secciones secundarias del sidebar (desktop). */
export const NAV_SECONDARY: NavDef[] = [{ href: "/settings", label: "Ajustes", Icon: Settings }];
