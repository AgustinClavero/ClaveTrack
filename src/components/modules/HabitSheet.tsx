"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { setHabitValue, toggleHabit } from "@/app/actions";
import { nf } from "@/lib/utils";
import type { Habit } from "@/types";

const CATEGORY_LABEL: Record<string, string> = {
  nutrition: "Nutrición",
  activity: "Movimiento",
  routine: "Rutina",
  mind: "Mente",
};

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
 * Registro rápido de cualquier hábito desde el botón "+".
 * Lo que se carga acá aparece en la página temática del hábito.
 */
export function HabitSheet({ habits }: { habits: Habit[] }) {
  const open = useUIStore((s) => s.activeSheet === "habit");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(habits);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocal(habits);
      setError(null);
    }
  }, [open, habits]);

  function apply(id: string, patch: Partial<Habit>) {
    setLocal((hs) => hs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function toggle(h: Habit) {
    const done = !h.done;
    apply(h.id, { done });
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done });
      if (!res.ok) {
        apply(h.id, { done: h.done });
        setError(res.error);
      } else router.refresh();
    });
  }

  function bump(h: Habit, delta: number) {
    const next = Math.max(0, Math.round((h.value + delta) * 100) / 100);
    apply(h.id, { value: next, done: h.target ? next >= h.target : next > 0 });
    startTransition(async () => {
      const res = await setHabitValue({ habitId: h.id, value: next });
      if (!res.ok) {
        apply(h.id, { value: h.value, done: h.done });
        setError(res.error);
      } else router.refresh();
    });
  }

  const groups = ["nutrition", "activity", "routine", "mind"].filter((c) => local.some((h) => h.category === c));

  return (
    <Sheet open={open} onClose={closeSheet} title="Registrar hábito" subtitle="Se carga en la página de cada uno." className="habit-sheet">
      {local.length === 0 ? (
        <p className="note">Todavía no tenés hábitos. Creá el primero en Ajustes.</p>
      ) : (
        groups.map((c) => (
          <div className="hs-group" key={c}>
            <span className="eyebrow">{CATEGORY_LABEL[c]}</span>
            <div className="hs-rows">
              {local
                .filter((h) => h.category === c)
                .map((h) => {
                  const numeric = h.kind !== "boolean" && h.target != null;
                  const d = decimalsFor(h);
                  return (
                    <div className={`hs-row${h.done ? " done" : ""}`} key={h.id}>
                      <span className="hs-e" aria-hidden="true">
                        {h.emoji}
                      </span>
                      <span className="hs-n">
                        {h.name}
                        {numeric && (
                          <small>
                            {nf(h.value, d)} / {nf(h.target ?? 0, d)} {h.unit}
                          </small>
                        )}
                      </span>
                      {numeric ? (
                        <span className="stepper-mini">
                          <button onClick={() => bump(h, -stepFor(h))} aria-label={`Restar a ${h.name}`}>
                            <Minus size={15} />
                          </button>
                          <span>{nf(h.value, d)}</span>
                          <button onClick={() => bump(h, stepFor(h))} aria-label={`Sumar a ${h.name}`}>
                            <Plus size={15} />
                          </button>
                        </span>
                      ) : (
                        <button
                          className={`hs-check${h.done ? " on" : ""}`}
                          onClick={() => toggle(h)}
                          aria-pressed={h.done}
                          aria-label={`Marcar ${h.name}`}
                        >
                          <Check size={15} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))
      )}
      {error && <p className="form-error">{error}</p>}
    </Sheet>
  );
}
