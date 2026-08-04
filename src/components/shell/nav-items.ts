import {
  Home,
  Utensils,
  LineChart,
  ListChecks,
  Target,
  FolderKanban,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavDef {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Secciones activas en Fase 1. */
export const NAV_MAIN: NavDef[] = [
  { href: "/today", label: "Hoy", Icon: Home },
  { href: "/nutrition", label: "Nutrición", Icon: Utensils },
  { href: "/progress", label: "Progreso", Icon: LineChart },
  { href: "/habits", label: "Hábitos", Icon: ListChecks },
];

/** Secciones de fases siguientes (visibles en el sidebar, deshabilitadas). */
export const NAV_SOON: NavDef[] = [
  { href: "#", label: "Objetivos", Icon: Target },
  { href: "#", label: "Proyectos", Icon: FolderKanban },
  { href: "#", label: "Estadísticas", Icon: BarChart3 },
];
