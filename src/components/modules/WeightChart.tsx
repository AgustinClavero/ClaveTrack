"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WeightPoint } from "@/types";
import { nf } from "@/lib/utils";

const RANGES = [
  { k: "30D", days: 30 },
  { k: "90D", days: 90 },
  { k: "1A", days: 365 },
  { k: "Todo", days: Infinity },
] as const;

/** Ancho por pesada. Con pocos puntos el gráfico llena el ancho disponible;
 *  con muchos se hace más largo y se arrastra en horizontal. */
const PX_PER_POINT = 52;
/** Cuántas pesadas recientes muestran su valor sobre la línea. */
const LABELLED = 3;

export function WeightChart({ series, targetKg }: { series: WeightPoint[]; targetKg: number }) {
  const [range, setRange] = useState<string>("90D");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(320);

  // El rango filtra de verdad la serie.
  const data = useMemo(() => {
    const days = RANGES.find((r) => r.k === range)?.days ?? Infinity;
    if (!isFinite(days)) return series;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const iso = cutoff.toISOString().slice(0, 10);
    const filtered = series.filter((p) => p.date >= iso);
    return filtered.length >= 2 ? filtered : series;
  }, [series, range]);

  // El ancho visible manda cuando hay pocas pesadas: sin esto el gráfico
  // quedaría corto y flotando a la izquierda.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const measure = () => setBoxW(box.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const H = 160;
  const W = Math.max(boxW, data.length * PX_PER_POINT);

  const kgs = data.map((p) => p.kg);
  const min = Math.min(...kgs, targetKg) - 1;
  const max = Math.max(...kgs, targetKg) + 1;
  const x = (i: number) => 6 + (i * (W - 12)) / Math.max(1, data.length - 1);
  const y = (kg: number) => 10 + ((max - kg) / (max - min || 1)) * (H - 20);

  const pts = data.map((p, i) => `${x(i)},${y(p.kg)}`).join(" ");
  const area = `${pts} ${x(data.length - 1)},${H} ${x(0)},${H}`;
  const first = data[0];
  const last = data[data.length - 1];
  const targetY = y(targetKg);

  const delta = last.kg - first.kg;
  const toGo = last.kg - targetKg;

  // Se muestran las últimas pesadas con su valor, no solo la final.
  const labelled = data
    .map((p, i) => ({ ...p, i }))
    .slice(-LABELLED)
    .map((p) => ({ ...p, pct: (x(p.i) / W) * 100, top: (y(p.kg) / H) * 100 }));

  // Arranca mirando lo más reciente, que es lo que uno quiere ver primero.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollLeft = box.scrollWidth;
  }, [W, range]);

  const scrolls = W > boxW + 4;

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

      <div className="chart-scroll" ref={scrollRef}>
        <div className="chart-wrap" style={{ width: W }}>
          {labelled.map((p, n) => (
            <div
              key={p.date}
              className="tip"
              // El último se apoya a la izquierda para no salirse por el borde.
              data-anchor={n === labelled.length - 1 ? "end" : "center"}
              style={{ left: `${p.pct}%`, top: `${p.top}%` }}
            >
              {nf(p.kg, 1)} kg
              {n === labelled.length - 1 && <small>último registro</small>}
            </div>
          ))}

          <svg className="line" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label="Gráfico de peso">
            <line x1="0" y1="20" x2={W} y2="20" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="80" x2={W} y2="80" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="140" x2={W} y2="140" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
            <polygon fill="var(--ink)" opacity="0.06" points={area} />
            <polyline
              fill="none"
              stroke="var(--ink)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pts}
            />
            {data.map((p, i) => (
              <circle
                key={p.date}
                cx={x(i)}
                cy={y(p.kg)}
                r={i === data.length - 1 ? 5.5 : 3.5}
                fill="var(--ink)"
                stroke="var(--surface)"
                strokeWidth="2.5"
              />
            ))}
            <line x1="0" y1={targetY} x2={W} y2={targetY} stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 5" />
          </svg>
        </div>
      </div>

      {scrolls && <p className="chart-hint">Deslizá el gráfico para ver las pesadas anteriores.</p>}

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
