"use client";

import { useState, useTransition } from "react";
import type { Habit } from "@/types";
import { toggleHabit } from "@/app/actions";

export function HabitList({ initial, date }: { initial: Habit[]; date: string }) {
  const [habits, setHabits] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const target = habits.find((h) => h.id === id);
    if (!target) return;
    const done = !target.done;
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, done } : h)));
    startTransition(async () => {
      await toggleHabit(id, date, done);
    });
  }

  if (habits.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
        Todavía no tenés hábitos. Agregalos desde el onboarding o Configuración.
      </div>
    );
  }

  return (
    <div className="card">
      {habits.map((h) => (
        <button
          key={h.id}
          className={`habit${h.done ? " done" : ""}`}
          onClick={() => toggle(h.id)}
          style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
        >
          <div className="check">{h.done ? "✓" : ""}</div>
          <div className="h-name">{h.name}</div>
          {h.meta && <div className="h-meta">{h.meta}</div>}
        </button>
      ))}
    </div>
  );
}
