"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { toggleHabit } from "@/app/actions";
import { useActiveDay } from "@/lib/hooks/use-active-day";
import { nf } from "@/lib/utils";
import type { Habit } from "@/types";

/** Dónde se carga cada hábito cuando necesita un número y no una marca. */
function pageFor(h: Habit): string {
  if (h.category === "nutrition") return "/nutrition";
  if (h.category === "activity") return "/activity";
  return "/routine";
}

/**
 * Pendientes del día, accionables. Antes era una lista de texto: se veían
 * los que faltaban pero había que ir a otra pantalla a marcarlos, y al
 * volver seguían ahí. Los de marca se resuelven acá; los que piden una
 * cantidad llevan a su página, que es donde está el control.
 */
export function PendingList({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const date = useActiveDay();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pending = habits.filter((h) => !h.done && !done.includes(h.id));

  function mark(h: Habit) {
    setDone((d) => [...d, h.id]);
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done: true, date });
      if (!res.ok) {
        setDone((d) => d.filter((x) => x !== h.id));
        setError(res.error);
      } else router.refresh();
    });
  }

  if (pending.length === 0) return <div className="empty-mini">Todo marcado por hoy. 🎯</div>;

  return (
    <>
      <ul className="todo-list">
        {pending.slice(0, 5).map((h) => {
          const numeric = h.kind !== "boolean" && h.target != null;
          // El agua en litros con cero decimales mostraba "0 / 3 L".
          const water = h.unit.toLowerCase() === "l";
          const val = water ? Math.round(h.value * 1000) : h.value;
          const goal = water ? Math.round((h.target ?? 0) * 1000) : (h.target ?? 0);
          const unit = water ? "ml" : h.unit;
          return (
            <li key={h.id}>
              {numeric ? (
                <button className="todo-row" onClick={() => router.push(pageFor(h))}>
                  <span aria-hidden="true">{h.emoji}</span>
                  <span className="tr-n">
                    {h.name}
                    <small>
                      {nf(val, 0)} / {nf(goal, 0)} {unit}
                    </small>
                  </span>
                  <ChevronRight size={16} className="tr-go" />
                </button>
              ) : (
                <button className="todo-row" onClick={() => mark(h)} aria-label={`Marcar ${h.name}`}>
                  <span aria-hidden="true">{h.emoji}</span>
                  <span className="tr-n">{h.name}</span>
                  <span className="tr-check">
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="form-error">{error}</p>}
    </>
  );
}
