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
  if (u === "l") return SIP_L; // 250 ml
  if (u.includes("paso")) return 500;
  if (u === "h") return 0.5;
  if (u === "min") return 5;
  return 1;
}
const decimalsFor = (h: Habit) => (["l", "h"].includes(h.unit.toLowerCase()) ? 1 : 0);

/** Lo que suma cada toque del agua: 250 ml. El dato se guarda en litros. */
const SIP_L = 0.25;
const ML = (l: number) => Math.round(l * 1000);

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
  const isSteps = h.unit.toLowerCase().includes("paso");
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

  // El agua se cuenta en mililitros: es como viene rotulado lo que uno toma.
  const [extra, setExtra] = useState("");

  /** Suma una cantidad escrita a mano, para los vasos que no son de 250. */
  function addExact() {
    const ml = Number(extra.replace(",", "."));
    if (!Number.isFinite(ml) || ml <= 0) return;
    setExtra("");
    bump(ml / 1000);
  }

  /** Fija el total del día. Los pasos no se suman: el teléfono ya da el total. */
  function setExact() {
    const n = Number(extra.replace(/[.\s]/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setExtra("");
    bump(n - h.value);
  }

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
                {nf(ML(h.value))} <span className="of">/ {nf(ML(h.target ?? 0))} ml</span>
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
            <>
              <div className="stepper-mini wide">
                <button onClick={() => bump(-SIP_L)} aria-label="Quitar 250 ml" disabled={h.value <= 0}>
                  <Minus size={16} />
                </button>
                <span>250 ml</span>
                <button onClick={() => bump(SIP_L)} aria-label="Sumar 250 ml">
                  <Plus size={16} />
                </button>
              </div>
              {/* Para lo que no viene de a 250: una botella de 600, un vaso de 300. */}
              <div className="water-exact">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Otra cantidad"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addExact()}
                  aria-label="Otra cantidad en mililitros"
                />
                <span className="wx-u">ml</span>
                <button onClick={addExact} disabled={!extra}>
                  Sumar
                </button>
              </div>
            </>
          ) : numeric ? (
            <>
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
              {/* El teléfono cuenta el día completo: se pega ese total acá. */}
              {isSteps && (
                <div className="water-exact">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Total del día"
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setExact()}
                    aria-label="Total de pasos del día"
                  />
                  <button onClick={setExact} disabled={!extra}>
                    Fijar
                  </button>
                </div>
              )}
            </>
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
