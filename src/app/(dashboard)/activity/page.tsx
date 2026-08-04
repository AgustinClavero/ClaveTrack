import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getActivityDay } from "@/lib/data/queries";
import { HabitCard } from "@/components/modules/HabitCard";
import { AddWorkoutButton } from "@/components/modules/AddWorkoutButton";
import { WorkoutRow } from "@/components/modules/WorkoutRow";
import { PageDate } from "@/components/shell/PageDate";
import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Meta semanal de minutos de actividad (recomendación OMS). */
const WEEKLY_MIN_GOAL = 150;

export default async function ActivityPage() {
  const d = await getActivityDay();
  if (!d) redirect("/login");

  const todayKcal = d.today.reduce((s, w) => s + w.kcal, 0);
  const todayMin = d.today.reduce((s, w) => s + w.minutes, 0);
  const todaySteps = d.today.reduce((s, w) => s + (w.steps ?? 0), 0);
  const weekMin = d.week.reduce((s, w) => s + w.minutes, 0);
  const weekKcal = d.week.reduce((s, w) => s + w.kcal, 0);

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Actividad</h1>
          <PageDate date={d.date} timezone={d.timezone} />
        </div>
        <AddWorkoutButton label="Registrar sesión" />
      </header>

      <div className="nut-grid">
        {/* ---- Hoy ---- */}
        <div className="card cal-hero">
          <div>
            <span className="eyebrow">Quemado hoy</span>
            <div className="cal-num">
              {nf(todayKcal)}
              <small>kcal</small>
            </div>
            <div className="cal-lbl">
              {todayMin > 0
                ? `${todayMin} min${todaySteps ? ` · ${nf(todaySteps)} pasos` : ""}`
                : "Todavía no te moviste hoy"}
            </div>
          </div>
          <Ring size={84} stroke={9} value={Math.min(1, todayMin / 45)} color="var(--red)" track="var(--red-tint)" centerFontSize={24}>
            🔥
          </Ring>
        </div>

        {d.habits.length > 0 && (
          <div className="cat-habits">
            <div className="sec-head">
              <span className="eyebrow">Tus objetivos de hoy</span>
              <Link href="/settings" className="head-action">
                <Settings size={16} />
                <span>Objetivos</span>
              </Link>
            </div>
            <div className="habit-grid">
              {d.habits.map((h) => (
                <HabitCard key={h.id} habit={h} readOnly={d.autoHabitIds.includes(h.id)} />
              ))}
            </div>
          </div>
        )}

        <div className="nut-meals">
          <div className="sec-head">
            <span className="eyebrow">Sesiones de hoy</span>
            <AddWorkoutButton />
          </div>
          {d.today.length === 0 ? (
            <div className="card empty-card">
              <p>Registrá tu primera sesión del día y calculamos las calorías por vos.</p>
              <AddWorkoutButton variant="solid" label="Registrar sesión" />
            </div>
          ) : (
            <div className="stack-sm">
              {d.today.map((w) => (
                <WorkoutRow key={w.id} workout={w} isToday />
              ))}
            </div>
          )}
        </div>

        {/* ---- Resumen semanal, claramente separado ---- */}
        <div className="week-block">
          <div className="sec-head">
            <span className="eyebrow">Últimos 7 días</span>
          </div>
          <div className="macro-cards">
            <div className="card macro-card">
              <div className="mc-val">
                {weekMin}
                <small>/{WEEKLY_MIN_GOAL} min</small>
              </div>
              <div className="mc-lab">Movimiento</div>
              <Ring size={64} stroke={8} value={Math.min(1, weekMin / WEEKLY_MIN_GOAL)} color="var(--blue)" track="var(--blue-tint)" centerFontSize={19}>
                ⏱
              </Ring>
            </div>
            <div className="card macro-card">
              <div className="mc-val">{nf(weekKcal)}</div>
              <div className="mc-lab">kcal quemadas</div>
              <Ring size={64} stroke={8} value={Math.min(1, weekKcal / 2000)} color="var(--red)" track="var(--red-tint)" centerFontSize={19}>
                🔥
              </Ring>
            </div>
            <div className="card macro-card">
              <div className="mc-val">{d.week.length}</div>
              <div className="mc-lab">Sesiones</div>
              <Ring size={64} stroke={8} value={Math.min(1, d.week.length / 5)} color="var(--amber)" track="var(--amber-tint)" centerFontSize={19}>
                🏃
              </Ring>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
