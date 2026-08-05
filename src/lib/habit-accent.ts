import type { Habit } from "@/types";

export interface HabitAccent {
  color: string;
  track: string;
}

/**
 * Color del anillo de un hábito: primero por lo que mide (agua siempre azul,
 * proteína siempre roja), y recién después por su categoría. Vive acá y no
 * dentro de una card para que el mismo hábito se vea igual en toda la app.
 */
export function habitAccent(h: Pick<Habit, "unit" | "name" | "category">): HabitAccent {
  const u = h.unit.toLowerCase();
  if (u === "l") return { color: "var(--blue)", track: "var(--blue-tint)" };
  if (u.includes("paso") || u === "km") return { color: "var(--blue)", track: "var(--blue-tint)" };
  if (u === "h" || /dorm|sue/i.test(h.name)) return { color: "var(--blue)", track: "var(--blue-tint)" };
  if (u === "min" || u === "x/sem") return { color: "var(--amber)", track: "var(--amber-tint)" };
  if (h.category === "nutrition") return { color: "var(--red)", track: "var(--red-tint)" };
  if (h.category === "activity") return { color: "var(--blue)", track: "var(--blue-tint)" };
  if (h.category === "mind") return { color: "var(--success)", track: "var(--surface-2)" };
  return { color: "var(--amber)", track: "var(--amber-tint)" };
}
