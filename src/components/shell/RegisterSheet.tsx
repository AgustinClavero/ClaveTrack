"use client";

import { useUIStore } from "@/lib/store";

const ACTIONS = [
  { icon: "🍽", name: "Comida" },
  { icon: "⚖️", name: "Peso" },
  { icon: "🏃", name: "Entreno" },
  { icon: "✓", name: "Hábito" },
  { icon: "📝", name: "Tarea" },
  { icon: "🛒", name: "Compra" },
  { icon: "⏱", name: "Pomodoro" },
  { icon: "🗒", name: "Nota" },
];

export function RegisterSheet() {
  const { sheetOpen, closeSheet } = useUIStore();
  return (
    <>
      <div className={`overlay${sheetOpen ? " show" : ""}`} onClick={closeSheet} />
      <div className={`sheet${sheetOpen ? " show" : ""}`} role="dialog" aria-label="Registrar">
        <div className="grip" />
        <h3>＋ Registrar</h3>
        <div className="sheet-grid">
          {ACTIONS.map((a) => (
            <button key={a.name} className="sa" onClick={closeSheet}>
              <div className="si">{a.icon}</div>
              <span className="sn">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
