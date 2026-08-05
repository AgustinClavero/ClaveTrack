"use client";

import { Plus } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { HabitQuickList, type HabitGroup } from "./HabitQuickList";
import type { Habit } from "@/types";

/**
 * Todo lo que se registra de nutrición en un lugar: la comida abre su propio
 * buscador, y suplementos, agua y sin azúcar se marcan acá mismo sin salir.
 */
export function NutritionSheet({ habits }: { habits: Habit[] }) {
  const open = useUIStore((s) => s.activeSheet === "nutrition");
  const openSheet = useUIStore((s) => s.openSheet);
  const closeSheet = useUIStore((s) => s.closeSheet);

  const mine = habits.filter((h) => h.category === "nutrition");
  const supplements = mine.filter((h) => h.groupKey === "supplements");
  const rest = mine.filter((h) => h.groupKey !== "supplements");

  const groups: HabitGroup[] = [
    { key: "rest", label: "Del día", habits: rest },
    { key: "supplements", label: "Suplementos", habits: supplements },
  ].filter((g) => g.habits.length > 0);

  return (
    <Sheet open={open} onClose={closeSheet} title="Registrar nutrición" subtitle="Se carga en la página de Nutrición." className="habit-sheet">
      <button className="btn-dark ns-meal" onClick={() => openSheet("meal")}>
        <Plus size={18} strokeWidth={2.5} />
        Registrar comida
      </button>

      {groups.length > 0 && <HabitQuickList groups={groups} active={open} />}
    </Sheet>
  );
}
