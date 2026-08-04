import { redirect } from "next/navigation";
import { getProgress } from "@/lib/data/queries";
import { nf } from "@/lib/utils";
import { WeightChart } from "@/components/modules/WeightChart";
import { AddWeightButton } from "@/components/modules/AddWeightButton";
import { AchievementGrid } from "@/components/modules/AchievementGrid";
import { MilestoneTrack } from "@/components/modules/MilestoneTrack";
import { ProgressCalendar } from "@/components/modules/ProgressCalendar";
import { Ring } from "@/components/ui/Ring";
import { weightMilestones, weightPace } from "@/lib/calculations/insights";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const d = await getProgress();
  if (!d) redirect("/login");

  const { weight, weightTarget, streak, calendar, achievements } = d;
  const current = weight.length ? weight[weight.length - 1].kg : 0;
  const start = weight.length ? weight[0].kg : 0;
  const pct =
    weight.length && start !== weightTarget
      ? Math.max(0, Math.min(100, Math.round(((start - current) / (start - weightTarget)) * 100)))
      : 0;
  const delta = weight.length >= 2 ? current - start : 0;

  const milestones = weightMilestones(start, current, weightTarget);
  const pace = weightPace(weight, weightTarget);

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Progreso</h1>
          <p className="screen-sub">
            {weight.length ? `${weight.length} registros · meta ${nf(weightTarget, 1)} kg` : "Registrá tu peso para empezar"}
          </p>
        </div>
        <AddWeightButton />
      </header>

      <div className="prog-grid">
        <div className="card wcard">
          <div className="eyebrow">Tu peso</div>
          <div className="wv">
            {current ? nf(current, 1) : "—"} <small>kg</small>
          </div>
          {delta !== 0 && (
            <div className={`w-delta${delta < 0 ? " good" : ""}`}>
              {delta > 0 ? "+" : ""}
              {nf(delta, 1)} kg desde el inicio
            </div>
          )}
          <div className="wbar">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="wmeta">
            {pct}% del camino a {nf(weightTarget, 1)} kg
          </div>
        </div>

        <div className="card streakcard">
          <div className="big">🔥 {streak}</div>
          <div className="eyebrow">Racha de días</div>
          <div className="sc-stats">
            <span>
              <b>{d.bestStreak}</b> mejor racha
            </span>
            <span>
              <b>{d.daysLogged}</b> días con registro
            </span>
            {d.avgScore != null && (
              <span>
                <b>{d.avgScore}%</b> promedio
              </span>
            )}
          </div>
          <div className="wk-dots">
            {calendar.map((c) => (
              <div className="d" key={c.date}>
                <span className="dl">{c.weekday.charAt(0)}</span>
                <Ring size={30} stroke={4} value={(c.score ?? 0) / 100} color="var(--ink)" track="var(--surface-2)" centerFontSize={11}>
                  {c.score != null ? "" : "·"}
                </Ring>
              </div>
            ))}
          </div>
        </div>

        <div className="prog-chart">
          {weight.length >= 2 ? (
            <WeightChart series={weight} targetKg={weightTarget} />
          ) : (
            <div className="card empty-card">
              <p>Registrá tu peso unos días y acá vas a ver tu evolución con tendencia y meta.</p>
              <AddWeightButton variant="solid" label="Registrar peso de hoy" />
            </div>
          )}
        </div>

        <div className="prog-milestones">
          <MilestoneTrack
            milestones={milestones}
            pace={pace}
            startKg={start}
            currentKg={current}
            targetKg={weightTarget}
          />
        </div>

        <div className="prog-ach">
          <AchievementGrid items={achievements} />
        </div>

        <div className="prog-days">
          <ProgressCalendar month={d.month} days={d.monthDays} threshold={d.threshold} timezone={d.timezone} />
        </div>
      </div>
    </section>
  );
}
