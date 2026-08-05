"use client";

import { FileText, ChevronRight } from "lucide-react";
import { useUIStore } from "@/lib/store";

/**
 * Acceso al cierre del día anterior desde el final de Inicio. Va acá y no
 * arriba a propósito: primero se resuelve el día de hoy, después se mira atrás.
 */
export function YesterdaySummaryCard({ date, label }: { date: string; label: string }) {
  const openSummary = useUIStore((s) => s.openSummary);

  return (
    <button className="card yday-card" onClick={() => openSummary(date)}>
      <span className="yc-ic">
        <FileText size={18} strokeWidth={2.2} />
      </span>
      <span className="yc-txt">
        <span className="yc-t">Ver resumen del día anterior</span>
        <span className="yc-d">{label}</span>
      </span>
      <ChevronRight size={18} className="yc-arrow" />
    </button>
  );
}
