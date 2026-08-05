"use client";

import { useEffect, useRef } from "react";
import { Ring } from "@/components/ui/Ring";
import { useUIStore } from "@/lib/store";
import type { CalendarDay } from "@/lib/data/queries";

/**
 * Tira de días deslizable que cruza meses: 7 días a la vista.
 * Hoy se pinta como disco negro sólido con el anillo de progreso en blanco;
 * el resto son anillos oscuros sobre fondo claro.
 */
export function CalendarStrip({ days }: { days: CalendarDay[] }) {
  const openDayDetail = useUIStore((s) => s.openDayDetail);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  /**
   * Centra la semana de hoy. Con ResizeObserver en vez de timers: el ancho de
   * las celdas depende del CSS y de las fuentes, que en dev llegan tarde.
   */
  useEffect(() => {
    const box = scrollRef.current;
    const el = todayRef.current;
    if (!box || !el) return;

    let done = false;
    const center = () => {
      if (done || box.scrollWidth <= box.clientWidth) return;
      box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2;
      if (box.scrollLeft > 0) {
        done = true;
        ro.disconnect();
      }
    };

    const ro = new ResizeObserver(center);
    ro.observe(box);
    ro.observe(el);
    center();

    return () => ro.disconnect();
  }, []);

  let lastMonth = "";

  return (
    <section className="card cal-card-wrap">
      <div className="cal7" ref={scrollRef}>
        {days.map((d) => {
          const showMonth = d.monthShort !== lastMonth;
          lastMonth = d.monthShort;
          const pct = d.score != null ? d.score / 100 : 0;

          return (
            <button
              key={d.date}
              ref={d.isToday ? todayRef : undefined}
              className={`cday${d.isToday ? " today" : ""}${d.isFuture ? " future" : ""}`}
              aria-current={d.isToday ? "date" : undefined}
              aria-label={`${d.weekday} ${d.dayNum} de ${d.monthShort}${d.score != null ? `, ${d.score}%` : ""}`}
              // Los días futuros no tienen nada que mostrar todavía.
              disabled={d.isFuture}
              onClick={() => openDayDetail(d.date)}
            >
              <span className="cdm">{showMonth ? d.monthShort : ""}</span>
              <span className="cdn">{d.weekday}</span>
              <span className="cdr">
                <Ring
                  size={44}
                  stroke={4}
                  value={pct}
                  color={d.isToday ? "var(--ink-contrast)" : "var(--ink)"}
                  // Sin el recuadro blanco detrás, --surface-2 se pierde contra el fondo.
                  track={d.isToday ? "rgba(255,255,255,0.28)" : "var(--line-strong)"}
                >
                  <span className="cdnum">{d.dayNum}</span>
                </Ring>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
