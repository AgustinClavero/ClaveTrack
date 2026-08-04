import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getActivityDay } from "@/lib/data/queries";
import { HabitCard } from "@/components/modules/HabitCard";
import { AddWorkoutButton } from "@/components/modules/AddWorkoutButton";
import { WorkoutRow } from "@/components/modules/WorkoutRow";
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
  const weekMin = d.week.reduce((s, w) => s + w.minutes, 0);
  const weekKcal = d.week.reduce((s, w) => s + w.kcal, 0);

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Actividad</h1>
          <p className="screen-sub">
            {d.today.length === 0 ? "Sin sesiones hoy" : `${d.today.length} ${d.today.length === 1 ? "sesión" : "sesiones"} hoy`}
          </p>
        </div>
        <AddWorkoutButton />
      </header>

      <div className="nut-grid">
        <div className="card cal-hero">
          <div>
            <span className="eyebrow">Quemado hoy</span>
            <div className="cal-num">
              {nf(todayKcal)}
              <small>kcal</small>
            </div>
            <div className="cal-lbl">
              {todayMin > 0 ? `${todayMin} min de movimiento` : "Todavía no te moviste hoy"}
            </div>
            <div className="dc-foot">
              <AddWorkoutButton label="Registrar sesión" />
            </div>
          </div>
          <Ring size={84} stroke={9} value={Math.min(1, todayMin / 45)} color="var(--ink)" centerFontSize={24}>
            🔥
          </Ring>
        </div>

        <div className="macro-cards">
          <div className="card macro-card">
            <div className="mc-val">
              {weekMin}
              <small>/{WEEKLY_MIN_GOAL} min</small>
            </div>
            <div className="mc-lab">Esta semana</div>
            <Ring size={64} stroke={8} value={Math.min(1, weekMin / WEEKLY_MIN_GOAL)} color="var(--ink)" track="var(--surface-2)" centerFontSize={19}>
              ⏱
            </Ring>
          </div>
          <div className="card macro-card">
            <div className="mc-val">{nf(weekKcal)}</div>
            <div className="mc-lab">kcal en 7 días</div>
            <Ring size={64} stroke={8} value={Math.min(1, weekKcal / 2000)} color="var(--ink)" track="var(--surface-2)" centerFontSize={19}>
              🔥
            </Ring>
          </div>
          <div className="card macro-card">
            <div className="mc-val">{d.week.length}</div>
            <div className="mc-lab">Sesiones</div>
            <Ring size={64} stroke={8} value={Math.min(1, d.week.length / 5)} color="var(--ink)" track="var(--surface-2)" centerFontSize={19}>
              🏃
            </Ring>
          </div>
        </div>

        {d.habits.length > 0 && (
          <div className="cat-habits">
            <div className="sec-head">
              <span className="eyebrow">Tus hábitos de movimiento</span>
              <Link href="/settings" className="head-action">
                <Settings size={16} />
                <span>Objetivos</span>
              </Link>
            </div>
            <div className="habit-grid">
              {d.habits.map((h) => (
                <HabitCard key={h.id} habit={h} />
              ))}
            </div>
          </div>
        )}

        <div className="nut-meals">
          <div className="sec-head">
            <span className="eyebrow">Sesiones de la semana</span>
            <AddWorkoutButton />
          </div>
          {d.week.length === 0 ? (
            <div className="card empty-card">
              <p>Registrá tu primera sesión y calculamos las calorías por vos.</p>
              <AddWorkoutButton variant="solid" label="Registrar sesión" />
            </div>
          ) : (
            <div className="stack-sm">
              {d.week.map((w) => (
                <WorkoutRow key={w.id} workout={w} isToday={w.date === d.date} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
