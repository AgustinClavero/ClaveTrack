import { Home, Utensils, LineChart, ListChecks, Settings, type LucideIcon } from "lucide-react";

export interface NavDef {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Secciones activas. */
export const NAV_MAIN: NavDef[] = [
  { href: "/today", label: "Hoy", Icon: Home },
  { href: "/nutrition", label: "Nutrición", Icon: Utensils },
  { href: "/progress", label: "Progreso", Icon: LineChart },
  { href: "/habits", label: "Hábitos", Icon: ListChecks },
];

/** Secciones secundarias del sidebar (desktop). */
export const NAV_SECONDARY: NavDef[] = [{ href: "/settings", label: "Ajustes", Icon: Settings }];
