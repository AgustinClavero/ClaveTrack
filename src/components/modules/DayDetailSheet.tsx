"use client";

import { useEffect, useState } from "react";
import { Check, FileText, X } from "lucide-react";
import { fetchDayDetail } from "@/app/actions";
import { useUIStore } from "@/lib/store";
import { scoreColor, scoreTint } from "@/lib/score-color";
import type { DayDetail } from "@/lib/data/queries";
import { Ring } from "@/components/ui/Ring";

/** Cuerpo del detalle. Se comparte entre el calendario del mes y la tira de Inicio. */
export function DayDetailBody({
  day,
  threshold,
  today,
  onClose,
}: {
  day: DayDetail;
  threshold: number;
  today: string;
  onClose: () => void;
}) {
  const openSummary = useUIStore((s) => s.openSummary);
  const met = day.total >= threshold;
  const done = day.items.filter((i) => i.done).length;

  return (
    <>
      <header className="dm-head">
        <Ring size={64} stroke={7} value={day.total / 100} color={scoreColor(day.total)} track={scoreTint(day.total)} centerFontSize={19}>
          <b>{day.total}</b>
        </Ring>
        <div>
          <h3>{day.label}</h3>
          <p>
            {met ? "Día cumplido" : `Debajo del ${threshold}%`} · {done} de {day.items.length}
          </p>
        </div>
        <button className="mr-del" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>

      {day.date < today && (
        <button className="btn-dark dm-summary" onClick={() => openSummary(day.date)}>
          <FileText size={16} strokeWidth={2.5} />
          Ver resumen del día
        </button>
      )}

      <ul className="dm-list">
        {day.items.map((i) => (
          <li key={i.label} className={i.done ? "ok" : "no"}>
            <div className="dm-top">
              <span className="dm-emoji" aria-hidden="true">
                {i.emoji}
              </span>
              <span className="dm-ic">{i.done ? <Check size={13} strokeWidth={3.5} /> : <X size={13} strokeWidth={3} />}</span>
            </div>
            <span className="dm-name">{i.label}</span>
            {i.detail && <span className="dm-val">{i.detail}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Detalle de un día pedido por fecha. Lo usa la tira de Inicio, donde no hay
 * un mes cargado en memoria como sí lo tiene el calendario de Progreso.
 */
export function DayDetailSheet() {
  const open = useUIStore((s) => s.activeSheet === "dayDetail");
  const date = useUIStore((s) => s.dayDetailDate);
  const close = useUIStore((s) => s.closeSheet);

  const [data, setData] = useState<{ day: DayDetail; threshold: number; today: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !date) return;
    let alive = true;
    setError(null);
    fetchDayDetail(date).then((res) => {
      if (!alive) return;
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [open, date]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <>
      <div className="overlay show" onClick={close} aria-hidden="true" />
      <div className="sheet day-modal show" role="dialog" aria-modal="true" aria-label="Detalle del día">
        <div className="grip" />
        {error && <p className="form-error">{error}</p>}
        {!error && !data && <p className="note">Cargando…</p>}
        {data && <DayDetailBody day={data.day} threshold={data.threshold} today={data.today} onClose={close} />}
      </div>
    </>
  );
}
