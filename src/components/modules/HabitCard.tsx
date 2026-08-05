"use client";

import { useState, useTransition } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { Habit } from "@/types";
import { toggleHabit, setHabitValue } from "@/app/actions";
import { useActiveDay } from "@/lib/hooks/use-active-day";
import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";
import { habitAccent } from "@/lib/habit-accent";

/** Paso de incremento según la unidad. */
function stepFor(h: Habit): number {
  const u = h.unit.toLowerCase();
  if (u === "l") return 0.25; // un vaso
  if (u.includes("paso")) return 500;
  if (u === "h") return 0.5;
  if (u === "min") return 5;
  return 1;
}
const decimalsFor = (h: Habit) => (["l", "h"].includes(h.unit.toLowerCase()) ? 1 : 0);

const GLASS_L = 0.25;

/**
 * Card de hábito del día: anillo de progreso contra el objetivo y el control
 * de carga que corresponda. Sin historial: acá solo importa hoy.
 */
export function HabitCard({ habit, readOnly = false }: { habit: Habit; readOnly?: boolean }) {
  const date = useActiveDay();
  const [h, setH] = useState(habit);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Cuando el servidor trae un valor distinto al que mandó la última vez
  // (por ejemplo, algo cargado desde el "+"), pisa el estado local.
  const stamp = `${habit.value}:${habit.done}`;
  const [syncedStamp, setSyncedStamp] = useState(stamp);
  if (syncedStamp !== stamp) {
    setSyncedStamp(stamp);
    setH(habit);
  }

  const numeric = h.kind !== "boolean" && h.target != null;
  const isWater = h.unit.toLowerCase() === "l";
  const d = decimalsFor(h);
  const pct = h.target ? Math.min(1, h.value / h.target) : h.done ? 1 : 0;
  const accent = habitAccent(h);

  function toggle() {
    const done = !h.done;
    const prev = h;
    setH({ ...h, done });
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done, date });
      if (!res.ok) {
        setH(prev);
        setError(res.error);
      } else setError(null);
    });
  }

  function bump(delta: number) {
    const next = Math.max(0, Math.round((h.value + delta) * 100) / 100);
    const prev = h;
    setH({ ...h, value: next, done: h.target ? next >= h.target : next > 0 });
    startTransition(async () => {
      const res = await setHabitValue({ habitId: h.id, value: next, date });
      if (!res.ok) {
        setH(prev);
        setError(res.error);
      } else setError(null);
    });
  }

  // El agua se cuenta en vasos: es la unidad con la que uno realmente toma.
  const glasses = isWater ? Math.round(h.value / GLASS_L) : 0;
  const glassGoal = isWater && h.target ? Math.round(h.target / GLASS_L) : 0;

  return (
    <article className={`card habit-cardx${h.done ? " done" : ""}`} data-cat={h.category}>
      <header className="hc-head">
        <div className="hc-ring">
          <Ring size={60} stroke={7} value={pct} color={accent.color} track={accent.track} centerFontSize={21}>
            {h.emoji}
          </Ring>
        </div>
        <div className="hc-id">
          <h3>{h.name}</h3>
          <p>
            {isWater ? (
              <>
                {glasses} <span className="of">/ {glassGoal} vasos · {nf(h.target ?? 0, 1)} L</span>
              </>
            ) : numeric ? (
              <>
                {nf(h.value, d)}{" "}
                <span className="of">
                  / {nf(h.target ?? 0, d)} {h.unit}
                </span>
              </>
            ) : h.done ? (
              (date ? "Hecho ese día" : "Hecho hoy")
            ) : (
              (date ? "Pendiente ese día" : "Pendiente hoy")
            )}
          </p>
        </div>
        {h.done && (
          <span className="hc-badge" aria-label="Cumplido">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </header>

      {!readOnly && (
        <footer className="hc-foot">
          {isWater ? (
            <div className="stepper-mini wide">
              <button onClick={() => bump(-GLASS_L)} aria-label="Quitar un vaso" disabled={h.value <= 0}>
                <Minus size={16} />
              </button>
              <span>vaso de 250 ml</span>
              <button onClick={() => bump(GLASS_L)} aria-label="Sumar un vaso">
                <Plus size={16} />
              </button>
            </div>
          ) : numeric ? (
            <div className="stepper-mini wide">
              <button onClick={() => bump(-stepFor(h))} aria-label={`Restar a ${h.name}`}>
                <Minus size={16} />
              </button>
              <span>
                {nf(h.value, d)} {h.unit}
              </span>
              <button onClick={() => bump(stepFor(h))} aria-label={`Sumar a ${h.name}`}>
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button className={`hc-toggle${h.done ? " on" : ""}`} onClick={toggle} aria-pressed={h.done}>
              {h.done ? "Hecho ✓" : "Marcar como hecho"}
            </button>
          )}
        </footer>
      )}

      {readOnly && <p className="hc-auto">Se completa con lo que registrás en el día</p>}
      {error && <p className="form-error">{error}</p>}
    </article>
  );
}
