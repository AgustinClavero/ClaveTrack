import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/data/queries";
import { nf } from "@/lib/utils";
import { WeightChart } from "@/components/modules/WeightChart";
import { RegisterWeight } from "@/components/modules/RegisterWeight";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const d = await getDashboard();
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  const { weight, weightTarget, streak, date } = d;
  const current = weight.length ? weight[weight.length - 1].kg : 0;
  const start = weight.length ? weight[0].kg : 0;
  const pct =
    weight.length && start !== weightTarget
      ? Math.max(0, Math.min(100, Math.round(((start - current) / (start - weightTarget)) * 100)))
      : 0;

  const week = ["D", "L", "M", "X", "J", "V", "S"].map((dn, i) => ({ d: dn, on: i < Math.min(streak, 7) }));

  return (
    <section className="screen">
      <div className="screen-title">Progreso</div>
      <div className="stack" style={{ marginTop: 14 }}>
        <div className="two">
          <div className="card wcard">
            <div className="wl">Tu peso</div>
            <div className="wv">
              {current ? nf(current, 1) : "—"} <small style={{ fontSize: 16, color: "var(--muted)" }}>kg</small>
            </div>
            <div className="wbar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="wmeta">Meta {nf(weightTarget, 1)} kg</div>
            <RegisterWeight date={date} current={current} />
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

        {weight.length >= 2 ? (
          <WeightChart series={weight} targetKg={weightTarget} />
        ) : (
          <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
            Registrá tu peso unos días y acá vas a ver tu evolución con tendencia y meta.
          </div>
        )}
      </div>
    </section>
  );
}
