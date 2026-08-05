import { redirect } from "next/navigation";
import { getProgress } from "@/lib/data/queries";
import { nf } from "@/lib/utils";
import { WeightChart } from "@/components/modules/WeightChart";
import { weightTrend } from "@/lib/calculations/weight-trend";
import { SwipeDeck } from "@/components/modules/SwipeDeck";
import { AddWeightButton } from "@/components/modules/AddWeightButton";
import { AchievementGrid } from "@/components/modules/AchievementGrid";
import { MilestoneTrack } from "@/components/modules/MilestoneTrack";
import { ProgressCalendar } from "@/components/modules/ProgressCalendar";
import { Ring } from "@/components/ui/Ring";
import { PageDate } from "@/components/shell/PageDate";
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
  const trend = weightTrend(weight);

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Progreso</h1>
          <p className="page-date">Tu evolución</p>
        </div>
        <AddWeightButton />
      </header>

      <div className="prog-grid">
        {/* En móvil son dos pantallas: se deslizan en vez de apilarse. */}
        <SwipeDeck labels={["Tu peso", "Calendario"]}>
          <div className="prog-summary">
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

              {/* La pesada de un día tiene mucho ruido: lo que importa es la media. */}
              {trend.hasData && (trend.avg7 != null || trend.perWeek != null) && (
                <>
                  <div className="wt-grid">
                    <div className="wt-cell">
                      <span className="wt-v">{trend.avg7 != null ? `${nf(trend.avg7, 1)}` : "—"}</span>
                      <span className="wt-l">Media 7 días</span>
                    </div>
                    <div className="wt-cell">
                      <span className="wt-v">{trend.avg30 != null ? `${nf(trend.avg30, 1)}` : "—"}</span>
                      <span className="wt-l">Media 30 días</span>
                    </div>
                    <div className="wt-cell">
                      <span className={`wt-v${trend.perWeek != null && trend.perWeek < 0 ? " good" : ""}`}>
                        {trend.perWeek != null ? `${trend.perWeek > 0 ? "+" : ""}${nf(trend.perWeek, 1)}` : "—"}
                      </span>
                      <span className="wt-l">kg / semana</span>
                    </div>
                  </div>
                  {trend.stalled && <p className="wt-note">Tres semanas sin cambios. Puede ser momento de revisar el plan.</p>}
                </>
              )}
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

          </div>

          <div className="prog-days">
            <ProgressCalendar month={d.month} days={d.monthDays} threshold={d.threshold} timezone={d.timezone} today={d.date} />
          </div>
        </SwipeDeck>

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

      </div>
    </section>
  );
}
