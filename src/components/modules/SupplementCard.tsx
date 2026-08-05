"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Settings } from "lucide-react";
import { toggleHabit } from "@/app/actions";
import { useActiveDay } from "@/lib/hooks/use-active-day";
import { Ring } from "@/components/ui/Ring";
import type { Habit } from "@/types";

/**
 * Suplementos del día: un anillo con el porcentaje tomado y el checklist
 * de cada uno. Los suplementos se definen en Ajustes.
 */
export function SupplementCard({ items }: { items: Habit[] }) {
  const date = useActiveDay();
  const [local, setLocal] = useState(items);

  // Igual que en las cards de hábito: lo cargado desde el "+" tiene que
  // verse acá sin recargar.
  const stamp = items.map((i) => `${i.id}:${i.done}`).join();
  const [syncedStamp, setSyncedStamp] = useState(stamp);
  if (syncedStamp !== stamp) {
    setSyncedStamp(stamp);
    setLocal(items);
  }
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const taken = local.filter((h) => h.done).length;
  const pct = local.length ? taken / local.length : 0;

  function toggle(h: Habit) {
    const done = !h.done;
    setLocal((hs) => hs.map((x) => (x.id === h.id ? { ...x, done } : x)));
    startTransition(async () => {
      const res = await toggleHabit({ habitId: h.id, done, date });
      if (!res.ok) {
        setLocal((hs) => hs.map((x) => (x.id === h.id ? { ...x, done: h.done } : x)));
        setError(res.error);
      } else setError(null);
    });
  }

  if (local.length === 0) {
    return (
      <div className="card supp-card empty">
        <div className="sup-head">
          <span className="sup-emoji" aria-hidden="true">
            💊
          </span>
          <div>
            <span className="eyebrow">Suplementos</span>
            <p className="note" style={{ margin: 0 }}>
              Cargá los que tomás a diario y los marcás desde acá.
            </p>
          </div>
        </div>
        <Link href="/settings" className="btn-dark-sm">
          Agregar suplementos
        </Link>
      </div>
    );
  }

  return (
    <div className="card supp-card">
      <div className="sup-head">
        <Ring size={64} stroke={8} value={pct} color="var(--red)" track="var(--red-tint)" centerFontSize={22}>
          💊
        </Ring>
        <div className="sup-id">
          <span className="eyebrow">Suplementos</span>
          <div className="sup-val">
            {taken}
            <small>/{local.length}</small>
          </div>
          <div className="sup-sub">{taken === local.length ? (date ? "Todos tomados" : "Todos tomados hoy") : `Faltan ${local.length - taken}`}</div>
        </div>
        <Link href="/settings" className="mr-del" aria-label="Gestionar suplementos">
          <Settings size={16} />
        </Link>
      </div>

      <ul className="sup-list">
        {local.map((h) => (
          <li key={h.id}>
            <button className={`sup-item${h.done ? " on" : ""}`} onClick={() => toggle(h)} aria-pressed={h.done}>
              <span className="sup-box">{h.done && <Check size={13} strokeWidth={3.5} />}</span>
              <span className="sup-name">{h.name}</span>
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
