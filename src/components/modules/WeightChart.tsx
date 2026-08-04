"use client";

import { useMemo, useState } from "react";
import type { WeightPoint } from "@/types";
import { nf } from "@/lib/utils";

const RANGES = [
  { k: "30D", days: 30 },
  { k: "90D", days: 90 },
  { k: "1A", days: 365 },
  { k: "Todo", days: Infinity },
] as const;

export function WeightChart({ series, targetKg }: { series: WeightPoint[]; targetKg: number }) {
  const [range, setRange] = useState<string>("90D");

  // El rango ahora filtra de verdad la serie.
  const data = useMemo(() => {
    const days = RANGES.find((r) => r.k === range)?.days ?? Infinity;
    if (!isFinite(days)) return series;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const iso = cutoff.toISOString().slice(0, 10);
    const filtered = series.filter((p) => p.date >= iso);
    return filtered.length >= 2 ? filtered : series;
  }, [series, range]);

  const W = 320;
  const H = 160;
  const kgs = data.map((p) => p.kg);
  const min = Math.min(...kgs, targetKg) - 1;
  const max = Math.max(...kgs, targetKg) + 1;
  const x = (i: number) => 6 + (i * (W - 12)) / Math.max(1, data.length - 1);
  const y = (kg: number) => 10 + ((max - kg) / (max - min || 1)) * (H - 20);

  const pts = data.map((p, i) => `${x(i)},${y(p.kg)}`).join(" ");
  const area = `${pts} ${x(data.length - 1)},${H} ${x(0)},${H}`;
  const first = data[0];
  const last = data[data.length - 1];
  const lastX = x(data.length - 1);
  const lastY = y(last.kg);
  const targetY = y(targetKg);

  const delta = last.kg - first.kg;
  const toGo = last.kg - targetKg;

  return (
    <div className="card chart-card">
      <div className="chart-head">
        <div>
          <span className="eyebrow">Progreso del peso</span>
          <div className="ch-delta">
            {delta === 0 ? (
              "Sin cambios en el período"
            ) : (
              <>
                <b className={delta < 0 ? "good" : ""}>
                  {delta > 0 ? "+" : ""}
                  {nf(delta, 1)} kg
                </b>{" "}
                en el período
              </>
            )}
          </div>
        </div>
        <span className="goal-pill">{toGo > 0 ? `faltan ${nf(toGo, 1)} kg` : "meta alcanzada 🎉"}</span>
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

      <div className="segs" role="group" aria-label="Rango del gráfico">
        {RANGES.map((r) => (
          <button
            key={r.k}
            className={`seg${range === r.k ? " active" : ""}`}
            onClick={() => setRange(r.k)}
            aria-pressed={range === r.k}
          >
            {r.k}
          </button>
        ))}
      </div>
    </div>
  );
}
