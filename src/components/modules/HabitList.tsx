"use client";

import { useState } from "react";
import type { Habit } from "@/types";

export function HabitList({ initial }: { initial: Habit[] }) {
  const [habits, setHabits] = useState(initial);

  function toggle(id: string) {
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, done: !h.done } : h)));
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
