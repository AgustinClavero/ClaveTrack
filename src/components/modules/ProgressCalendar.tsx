"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Ring } from "@/components/ui/Ring";
import { fetchMonthDetail } from "@/app/actions";
import { addMonths, monthGrid, monthLabel, type MonthCell } from "@/lib/date";
import type { DayDetail } from "@/lib/data/queries";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Calendario mensual del progreso: cada día muestra su cumplimiento y al
 * tocarlo se abre el detalle de ese día.
 */
export function ProgressCalendar({
  month: initialMonth,
  days: initialDays,
  threshold,
  timezone,
}: {
  month: string;
  days: DayDetail[];
  threshold: number;
  timezone: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [selected, setSelected] = useState<DayDetail | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const grid: MonthCell[] = useMemo(() => monthGrid(month, timezone), [month, timezone]);

  const metCount = grid.filter((c) => c.inMonth && (byDate.get(c.date)?.total ?? 0) >= threshold).length;
  const loggedCount = grid.filter((c) => c.inMonth && (byDate.get(c.date)?.total ?? 0) > 0).length;

  function go(delta: number) {
    const next = addMonths(month, delta);
    setError(null);
    startTransition(async () => {
      const res = await fetchMonthDetail(next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMonth(next);
      setDays(res.data);
    });
  }

  return (
    <section className="card prog-cal">
      <header className="pc-head">
        <div>
          <span className="eyebrow">Ver progreso diario</span>
          <h3 className="pc-month">{monthLabel(month)}</h3>
        </div>
        <div className="pc-nav">
          <button onClick={() => go(-1)} disabled={pending} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => go(1)} disabled={pending} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="pc-stats">
        <span>
          <b>{metCount}</b> días cumplidos
        </span>
        <span>
          <b>{loggedCount}</b> con registro
        </span>
      </div>

      <div className="pc-week" aria-hidden="true">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className={`pc-grid${pending ? " loading" : ""}`}>
        {grid.map((c) => {
          const d = byDate.get(c.date);
          const total = d?.total ?? 0;
          const met = total >= threshold;
          return (
            <button
              key={c.date}
              className={`pc-day${c.inMonth ? "" : " out"}${c.isToday ? " today" : ""}${c.isFuture ? " future" : ""}`}
              onClick={() => d && setSelected(d)}
              disabled={!d || c.isFuture}
              aria-label={`${c.dayNum} de ${c.monthShort}${total ? `, ${total}%` : ", sin registro"}`}
            >
              <Ring
                size={36}
                stroke={3.5}
                value={total / 100}
                color={met ? "var(--ink)" : "var(--muted)"}
                track="var(--surface-2)"
                centerFontSize={12}
              >
                <span className="pc-num">{c.dayNum}</span>
              </Ring>
            </button>
          );
        })}
      </div>

      {error && <p className="form-error">{error}</p>}
      <p className="note">Tocá cualquier día para ver el detalle.</p>

      {selected && <DayModal day={selected} threshold={threshold} onClose={() => setSelected(null)} />}
    </section>
  );
}

function DayModal({ day, threshold, onClose }: { day: DayDetail; threshold: number; onClose: () => void }) {
  const met = day.total >= threshold;
  const done = day.items.filter((i) => i.done).length;

  return (
    <>
      <div className="overlay show" onClick={onClose} aria-hidden="true" />
      <div className="sheet day-modal show" role="dialog" aria-modal="true" aria-label={`Detalle de ${day.label}`}>
        <div className="grip" />
        <header className="dm-head">
          <Ring size={64} stroke={7} value={day.total / 100} color="var(--ink)" track="var(--surface-2)" centerFontSize={19}>
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

        <ul className="dm-list">
          {day.items.map((i) => (
            <li key={i.label} className={i.done ? "ok" : "no"}>
              <span className="dm-ic">{i.done ? <Check size={13} strokeWidth={3.5} /> : <X size={13} strokeWidth={3} />}</span>
              <span className="dm-name">
                <span aria-hidden="true">{i.emoji}</span> {i.label}
              </span>
              {i.detail && <span className="dm-val">{i.detail}</span>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
