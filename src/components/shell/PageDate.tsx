"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { addDays } from "@/lib/date";

/**
 * Fecha del día que se está viendo, con flechas para movernos.
 * Sirve para completar un día que quedó sin cargar: la página entera
 * pasa a leer y escribir sobre esa fecha.
 */
export function PageDate({
  date,
  timezone,
  today,
  isToday,
}: {
  date: string;
  timezone?: string;
  today: string;
  isToday: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));

  function go(delta: number) {
    const next = addDays(date, delta);
    if (next > today) return;
    router.push(next === today ? pathname : `${pathname}?d=${next}`);
  }

  const canForward = date < today;

  return (
    <div className="date-block">
      <div className="date-nav">
        <button onClick={() => go(-1)} aria-label="Día anterior">
          <ChevronLeft size={18} />
        </button>

        <span className="date-label">{label.charAt(0).toUpperCase() + label.slice(1)}</span>

        <button onClick={() => go(1)} disabled={!canForward} aria-label="Día siguiente">
          <ChevronRight size={18} />
        </button>

        {!isToday && (
          <button className="date-today" onClick={() => router.push(pathname)}>
            <RotateCcw size={14} />
            Hoy
          </button>
        )}
      </div>
    </div>
  );
}
