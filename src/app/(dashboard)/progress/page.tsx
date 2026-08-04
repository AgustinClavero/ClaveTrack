import { getToday } from "@/lib/data/mock";
import { nf } from "@/lib/utils";
import { WeightChart } from "@/components/modules/WeightChart";

export default async function ProgressPage() {
  const { weight, measures, weightTarget, streak } = await getToday();
  const current = weight[weight.length - 1].kg;
  const start = weight[0].kg;
  const pct = Math.min(100, Math.round(((start - current) / (start - weightTarget)) * 100));

  const week = [
    { d: "D", on: true },
    { d: "L", on: true },
    { d: "M", on: false },
    { d: "X", on: false },
    { d: "J", on: false },
    { d: "V", on: false },
    { d: "S", on: false },
  ];

  return (
    <section className="screen">
      <div className="screen-title">Progreso</div>
      <div className="stack" style={{ marginTop: 14 }}>
        <div className="two">
          <div className="card wcard">
            <div className="wl">Tu peso</div>
            <div className="wv">
              {nf(current, 1)} <small style={{ fontSize: 16, color: "var(--muted)" }}>kg</small>
            </div>
            <div className="wbar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="wmeta">Meta {nf(weightTarget, 1)} kg</div>
            <button className="btn-dark-sm">Registrar peso →</button>
          </div>
          <div className="card streakcard">
            <div className="big">🔥 {streak}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>Racha de días</div>
            <div className="wk-dots">
              {week.map((w, i) => (
                <div className="d" key={i}>
                  {w.d}
                  <div className={`dd${w.on ? " on" : ""}`}>{w.on ? "✓" : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <WeightChart series={weight} targetKg={weightTarget} />

        <div className="card">
          <div className="sec-label" style={{ margin: "0 0 12px" }}>
            Medidas corporales
          </div>
          {measures.map((m) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 14,
              }}
            >
              <span>{m.label}</span>
              <span style={{ fontWeight: 700 }}>
                {nf(m.cm)} cm{" "}
                <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                  {m.deltaCm === 0 ? "estable" : `${m.deltaCm > 0 ? "▲" : "▼"} ${nf(Math.abs(m.deltaCm), 1)}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
