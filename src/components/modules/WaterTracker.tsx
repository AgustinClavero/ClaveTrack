"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { addWater } from "@/app/actions";
import { nf } from "@/lib/utils";

const GLASS_ML = 250;

export function WaterTracker({ waterMl, goalMl }: { waterMl: number; goalMl: number }) {
  const [ml, setMl] = useState(waterMl);
  const [, startTransition] = useTransition();
  const pct = goalMl ? Math.min(100, Math.round((ml / goalMl) * 100)) : 0;

  function bump(delta: number) {
    const next = Math.max(0, ml + delta);
    setMl(next);
    startTransition(async () => {
      const res = await addWater({ ml: delta });
      if (res.ok) setMl(res.data.waterMl);
      else setMl(ml);
    });
  }

  return (
    <div className="card water-card">
      <div className="wt-head">
        <span className="eyebrow">Agua</span>
        <span className="wt-val">
          {nf(ml / 1000, 2)} <small>/ {nf(goalMl / 1000, 1)} L</small>
        </span>
      </div>
      <div className="wt-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="wt-actions">
        <button onClick={() => bump(-GLASS_ML)} aria-label="Quitar un vaso" disabled={ml === 0}>
          <Minus size={16} />
        </button>
        <span className="wt-hint">vaso de 250 ml</span>
        <button onClick={() => bump(GLASS_ML)} aria-label="Sumar un vaso">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
