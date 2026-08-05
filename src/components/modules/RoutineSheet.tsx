"use client";

import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { HabitQuickList, type HabitGroup } from "./HabitQuickList";
import type { Habit } from "@/types";

/** Rutina y mente: lo que no se resuelve en Nutrición ni en Actividad. */
const isRoutine = (h: Habit) => h.category === "routine" || h.category === "mind";

/**
 * Registro rápido de la rutina desde el botón "+": planificar el día, leer,
 * dormir. Nutrición y movimiento tienen su propio flujo, así que no entran acá.
 */
export function RoutineSheet({ habits }: { habits: Habit[] }) {
  const open = useUIStore((s) => s.activeSheet === "routine");
  const closeSheet = useUIStore((s) => s.closeSheet);

  const mine = habits.filter(isRoutine);
  const groups: HabitGroup[] = [
    { key: "routine", label: "Rutina", habits: mine.filter((h) => h.category === "routine") },
    { key: "mind", label: "Mente", habits: mine.filter((h) => h.category === "mind") },
  ].filter((g) => g.habits.length > 0);

  return (
    <Sheet open={open} onClose={closeSheet} title="Registrar rutina" subtitle="Se carga en la página de Rutina." className="habit-sheet">
      {mine.length === 0 ? (
        <p className="note">Todavía no tenés hábitos de rutina. Creá el primero en Ajustes.</p>
      ) : (
        <HabitQuickList groups={groups} active={open} />
      )}
    </Sheet>
  );
}
