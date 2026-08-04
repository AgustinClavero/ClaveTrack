"use client";

import { useUIStore } from "@/lib/store";
import { Sheet } from "./Sheet";

/** Acciones rápidas del botón "+". Cada una abre su flujo real. */
export function RegisterSheet() {
  const open = useUIStore((s) => s.activeSheet === "register");
  const openSheet = useUIStore((s) => s.openSheet);
  const closeSheet = useUIStore((s) => s.closeSheet);

  const ACTIONS = [
    { icon: "🍽", name: "Comida", go: () => openSheet("meal") },
    { icon: "🏃", name: "Actividad", go: () => openSheet("workout") },
    { icon: "✅", name: "Hábito", go: () => openSheet("habit") },
    { icon: "⚖️", name: "Peso", go: () => openSheet("weight") },
    { icon: "📋", name: "Check-in", go: () => openSheet("checkin") },
  ];

  return (
    <Sheet open={open} onClose={closeSheet} title="＋ Registrar" className="register">
      <div className="sheet-grid">
        {ACTIONS.map((a) => (
          <button key={a.name} className="sa" onClick={a.go}>
            <div className="si">{a.icon}</div>
            <span className="sn">{a.name}</span>
          </button>
        ))}
      </div>
      <p className="sheet-note">Tareas y pomodoro llegan con el módulo Trabajo.</p>
    </Sheet>
  );
}
