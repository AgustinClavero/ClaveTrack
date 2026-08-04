"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import type { Habit } from "@/types";
import { toggleHabit, setHabitValue } from "@/app/actions";
import { nf } from "@/lib/utils";

/** Paso de incremento según la unidad del hábito. */
function stepFor(h: Habit): number {
  const u = h.unit.toLowerCase();
  if (u === "l") return 0.25;
  if (u.includes("paso")) return 500;
  if (u === "h") return 0.5;
  if (u === "min") return 5;
  return 1;
}

const decimalsFor = (h: Habit) => (h.unit.toLowerCase() === "l" || h.unit.toLowerCase() === "h" ? 1 : 0);

export function HabitList({ initial }: { initial: Habit[] }) {
  const [habits, setHabits] = useState(initial);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(h: Habit) {
    const done = !h.done;
    const prev = habits;
    setHabits((hs) => hs.map((x) => (x.id === h.id ? { ...x, done } : x)));
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done });
      if (!res.ok) {
        setHabits(prev); // rollback: la UI no miente
        setError(res.error);
      } else setError(null);
    });
  }

  function bump(h: Habit, delta: number) {
    const target = h.target ?? 0;
    const next = Math.max(0, Math.round((h.value + delta) * 100) / 100);
    const prev = habits;
    setHabits((hs) =>
      hs.map((x) => (x.id === h.id ? { ...x, value: next, done: target ? next >= target : next > 0 } : x))
    );
    startTransition(async () => {
      const res = await setHabitValue({ habitId: h.id, value: next });
      if (!res.ok) {
        setHabits(prev);
        setError(res.error);
      } else setError(null);
    });
  }

  if (habits.length === 0) {
    return (
      <div className="card empty-card">
        <p>Todavía no tenés hábitos.</p>
        <a className="btn-dark-sm" href="/settings">
          Crear mi primer hábito
        </a>
      </div>
    );
  }

  return (
    <div className="card habit-card">
      {habits.map((h) => {
        const numeric = h.kind !== "boolean" && h.target != null;
        const d = decimalsFor(h);
        return (
          <div key={h.id} className={`habit-row${h.done ? " done" : ""}`}>
            <button className="check" onClick={() => toggle(h)} aria-pressed={h.done} aria-label={`Marcar ${h.name}`}>
              {h.done ? "✓" : ""}
            </button>

            <div className="hr-main">
              <div className="hr-name">
                {h.emoji !== "✓" && (
                  <span className="hr-emoji" aria-hidden="true">
                    {h.emoji}
                  </span>
                )}
                {h.name}
              </div>
              {numeric && (
                <div className="hr-meta">
                  {nf(h.value, d)} / {nf(h.target ?? 0, d)} {h.unit}
                </div>
              )}
            </div>

            {numeric ? (
              <div className="stepper-mini">
                <button onClick={() => bump(h, -stepFor(h))} aria-label={`Restar a ${h.name}`}>
                  <Minus size={15} />
                </button>
                <span>{nf(h.value, d)}</span>
                <button onClick={() => bump(h, stepFor(h))} aria-label={`Sumar a ${h.name}`}>
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <span className="hr-tag">diario</span>
            )}
          </div>
        );
      })}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
