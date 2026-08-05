"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { setHabitValue, toggleHabit } from "@/app/actions";
import { useActiveDay } from "@/lib/hooks/use-active-day";
import { nf } from "@/lib/utils";
import type { Habit } from "@/types";

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
/** El agua se cuenta en vasos, igual que en su card: en litros el paso de
 *  0,25 se mostraba como "0,3" y saltaba a "0,5". */
const isWater = (h: Habit) => h.unit.toLowerCase() === "l";

export interface HabitGroup {
  key: string;
  label: string;
  habits: Habit[];
}

/**
 * Filas de carga rápida de hábitos. La comparten las hojas de Rutina y
 * Nutrición: mismo gesto y misma actualización optimista en las dos.
 */
export function HabitQuickList({ groups, active }: { groups: HabitGroup[]; active: boolean }) {
  const router = useRouter();
  const date = useActiveDay();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState<Habit[]>(() => groups.flatMap((g) => g.habits));
  const [error, setError] = useState<string | null>(null);

  // Al abrir se resincroniza: entre apertura y apertura el día pudo cambiar.
  useEffect(() => {
    if (active) {
      setLocal(groups.flatMap((g) => g.habits));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, groups.map((g) => g.habits.map((h) => `${h.id}:${h.value}:${h.done}`).join()).join("|")]);

  function apply(id: string, patch: Partial<Habit>) {
    setLocal((hs) => hs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function toggle(h: Habit) {
    const done = !h.done;
    apply(h.id, { done });
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done, date });
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
      const res = await setHabitValue({ habitId: h.id, value: next, date });
      if (!res.ok) {
        apply(h.id, { value: h.value, done: h.done });
        setError(res.error);
      } else router.refresh();
    });
  }

  const byId = new Map(local.map((h) => [h.id, h]));

  return (
    <>
      {groups.map((g) => (
        <div className="hs-group" key={g.key}>
          <span className="eyebrow">{g.label}</span>
          <div className="hs-rows">
            {g.habits.map((raw) => {
              const h = byId.get(raw.id) ?? raw;
              const numeric = h.kind !== "boolean" && h.target != null;
              const d = decimalsFor(h);
              const water = isWater(h);
              const shown = water ? Math.round(h.value / GLASS_L) : h.value;
              const goal = water ? Math.round((h.target ?? 0) / GLASS_L) : (h.target ?? 0);
              const unit = water ? "vasos" : h.unit;
              return (
                <div className={`hs-row${h.done ? " done" : ""}`} key={h.id}>
                  <span className="hs-e" aria-hidden="true">
                    {h.emoji}
                  </span>
                  <span className="hs-n">
                    {h.name}
                    {numeric && (
                      <small>
                        {nf(shown, water ? 0 : d)} / {nf(goal, water ? 0 : d)} {unit}
                      </small>
                    )}
                  </span>
                  {numeric ? (
                    <span className="stepper-mini">
                      <button onClick={() => bump(h, -stepFor(h))} aria-label={`Restar a ${h.name}`}>
                        <Minus size={15} />
                      </button>
                      <span>{nf(shown, water ? 0 : d)}</span>
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
      ))}
      {error && <p className="form-error">{error}</p>}
    </>
  );
}
