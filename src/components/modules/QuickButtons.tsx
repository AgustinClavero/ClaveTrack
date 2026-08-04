"use client";

import { useUIStore } from "@/lib/store";

/** Botones de acción de la pantalla Hoy (abren la hoja de registro). */
export function QuickButtons() {
  const openSheet = useUIStore((s) => s.openSheet);
  return (
    <div className="btn-row">
      <button className="btn-ghost" onClick={openSheet}>
        ✦ Corregir
      </button>
      <button className="btn-solid" onClick={openSheet}>
        ＋ Registrar comida
      </button>
    </div>
  );
}
