"use client";

import { useState } from "react";
import type { WeightPoint } from "@/types";
import { nf } from "@/lib/utils";

const RANGES = ["90D", "6M", "1A", "Todo"];

export function WeightChart({ series, targetKg }: { series: WeightPoint[]; targetKg: number }) {
  const [range, setRange] = useState("6M");

  const W = 320;
  const H = 160;
  const kgs = series.map((p) => p.kg);
  const min = Math.min(...kgs, targetKg) - 1;
  const max = Math.max(...kgs) + 1;
  const x = (i: number) => 6 + (i * (W - 12)) / (series.length - 1);
  const y = (kg: number) => 10 + ((max - kg) / (max - min)) * (H - 20);

  const pts = series.map((p, i) => `${x(i)},${y(p.kg)}`).join(" ");
  const area = `${pts} ${x(series.length - 1)},${H} ${x(0)},${H}`;
  const last = series[series.length - 1];
  const lastX = x(series.length - 1);
  const lastY = y(last.kg);
  const targetY = y(targetKg);
  const pct = Math.round(
    (Math.min(series[0].kg - last.kg, series[0].kg - targetKg) / (series[0].kg - targetKg)) * 100
  );

  return (
    <div className="card">
      <div className="chart-head">
        <b>Progreso del peso</b>
        <span className="goal-pill">🏁 {pct}% de la meta</span>
      </div>
      <div className="chart-wrap">
        <div className="tip" style={{ left: `${(lastX / W) * 100}%`, top: `${(lastY / H) * 100}%` }}>
          {nf(last.kg, 1)} kg
          <small>último registro</small>
        </div>
        <svg className="line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Gráfico de peso">
          <line x1="0" y1="20" x2={W} y2="20" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2={W} y2="80" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="140" x2={W} y2="140" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
          <polygon fill="var(--ink)" opacity="0.06" points={area} />
          <polyline fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
          <circle cx={lastX} cy={lastY} r="5.5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="3" />
          <line x1="0" y1={targetY} x2={W} y2={targetY} stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 5" />
        </svg>
      </div>
      <div className="segs">
        {RANGES.map((r) => (
          <button key={r} className={`seg${range === r ? " active" : ""}`} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="motiv">La constancia es clave, y lo estás logrando. 💪</div>
    </div>
  );
}
