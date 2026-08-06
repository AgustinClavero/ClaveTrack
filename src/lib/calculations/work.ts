// ============================================================
// Dominio del módulo Trabajo. Puro: sin red ni Supabase.
//
// La regla de fondo: el día se juzga por lo que estaba planificado PARA hoy,
// no por todo lo que hay pendiente. Una lista de 40 tareas sin fecha no
// puede hundir el cumplimiento de un martes.
// ============================================================

export type TaskStatus = "pendiente" | "haciendo" | "hecha";
export type TaskPriority = "baja" | "media" | "alta";
export type ProjectStatus = "activo" | "pausado" | "terminado" | "archivado";
export type ObjectiveStatus = "activo" | "pausado" | "logrado" | "archivado";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Por hacer",
  haciendo: "Haciendo",
  hecha: "Hecha",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

/** Orden de prioridad para listar: primero lo urgente. */
export const PRIORITY_RANK: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };

export interface TaskLike {
  status: TaskStatus;
  dueDate: string | null;
}

/**
 * Área Foco del día: qué proporción de lo planificado para hoy quedó hecho.
 * Cuenta lo vencido junto con lo de hoy: una tarea de ayer sin cerrar sigue
 * siendo trabajo del día.
 */
export function focusArea(tasks: TaskLike[], today: string): { value: number; hasData: boolean } {
  const delDia = tasks.filter((t) => t.dueDate != null && t.dueDate <= today);
  if (delDia.length === 0) return { value: 0, hasData: false };
  const hechas = delDia.filter((t) => t.status === "hecha").length;
  return { value: (hechas / delDia.length) * 100, hasData: true };
}

/** Progreso de un proyecto por sus tareas cerradas. */
export function projectProgress(tasks: { status: TaskStatus }[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "hecha").length / tasks.length) * 100);
}

/** Progreso de un objetivo por el promedio de sus proyectos. */
export function objectiveProgress(projects: { progress: number }[]): number {
  if (projects.length === 0) return 0;
  return Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
}

/** Cómo se lee una fecha de vencimiento en la lista. */
export function dueLabel(due: string | null, today: string): { text: string; late: boolean } | null {
  if (!due) return null;
  if (due < today) return { text: "Vencida", late: true };
  if (due === today) return { text: "Hoy", late: false };

  const d = Math.round((Date.parse(due + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
  if (d === 1) return { text: "Mañana", late: false };
  if (d <= 7) return { text: `En ${d} días`, late: false };
  return {
    text: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(due + "T12:00:00Z")
    ),
    late: false,
  };
}
