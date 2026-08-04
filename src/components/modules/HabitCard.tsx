"use client";

import { useState, useTransition } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { Habit } from "@/types";
import { toggleHabit, setHabitValue } from "@/app/actions";
import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";

/** Paso de incremento según la unidad. */
function stepFor(h: Habit): number {
  const u = h.unit.toLowerCase();
  if (u === "l") return 0.25;
  if (u.includes("paso")) return 500;
  if (u === "h") return 0.5;
  if (u === "min") return 5;
  return 1;
}
const decimalsFor = (h: Habit) => (["l", "h"].includes(h.unit.toLowerCase()) ? 1 : 0);

/**
 * Card de hábito: anillo de progreso contra el objetivo, control de carga
 * acorde al tipo y una barra de los últimos 7 días.
 */
export function HabitCard({ habit }: { habit: Habit }) {
  const [h, setH] = useState(habit);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const numeric = h.kind !== "boolean" && h.target != null;
  const d = decimalsFor(h);
  const pct = h.target ? Math.min(1, h.value / h.target) : h.done ? 1 : 0;

  function toggle() {
    const done = !h.done;
    const prev = h;
    setH({ ...h, done });
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done });
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
      const res = await setHabitValue({ habitId: h.id, value: next });
      if (!res.ok) {
        setH(prev);
        setError(res.error);
      } else setError(null);
    });
  }

  const max = Math.max(h.target ?? 0, ...(h.history ?? []).map((x) => x.value), 1);

  return (
    <article className={`card habit-cardx${h.done ? " done" : ""}`}>
      <header className="hc-head">
        <div className="hc-ring">
          <Ring size={56} stroke={7} value={pct} color="var(--ink)" track="var(--surface-2)" centerFontSize={20}>
            {h.emoji}
          </Ring>
        </div>
        <div className="hc-id">
          <h3>{h.name}</h3>
          <p>
            {numeric ? (
              <>
                {nf(h.value, d)} <span className="of">/ {nf(h.target ?? 0, d)} {h.unit}</span>
              </>
            ) : h.done ? (
              "Hecho hoy"
            ) : (
              "Pendiente"
            )}
          </p>
        </div>
        {h.done && (
          <span className="hc-badge" aria-label="Cumplido">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </header>

      {/* Últimos 7 días contra el objetivo */}
      {h.history && h.history.length > 0 && (
        <div className="hc-spark" aria-hidden="true">
          {h.history.map((p) => {
            const hgt = numeric ? Math.max(6, Math.round((p.value / max) * 100)) : p.done ? 100 : 6;
            return (
              <span key={p.date} className={`hc-bar${p.done ? " on" : ""}`}>
                <i style={{ height: `${hgt}%` }} />
              </span>
            );
          })}
        </div>
      )}

      <footer className="hc-foot">
        {numeric ? (
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

      {error && <p className="form-error">{error}</p>}
    </article>
  );
}
