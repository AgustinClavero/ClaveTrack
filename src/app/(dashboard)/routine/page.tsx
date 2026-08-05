import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getHabitsDay } from "@/lib/data/queries";
import { HabitCard } from "@/components/modules/HabitCard";
import { Ring } from "@/components/ui/Ring";
import { PageDate } from "@/components/shell/PageDate";

export const dynamic = "force-dynamic";

export default async function RoutinePage({ searchParams }: { searchParams: { d?: string } }) {
  const d = await getHabitsDay(["routine", "mind"], searchParams?.d);
  if (!d) redirect("/login");

  const done = d.habits.filter((h) => h.done).length;
  const pct = d.habits.length ? Math.round((done / d.habits.length) * 100) : 0;

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Rutina</h1>
          <PageDate date={d.date} timezone={d.timezone} today={d.todayDate} isToday={d.isToday} />
        </div>
        <Link href="/settings" className="head-action">
          <Settings size={17} />
          <span>Objetivos</span>
        </Link>
      </header>

      <div className="nut-grid">
        <div className="card cal-hero">
          <div>
            <span className="eyebrow">{d.isToday ? "Tu rutina de hoy" : "Tu rutina de ese día"}</span>
            <div className="cal-num">
              {done}
              <small>/{d.habits.length}</small>
            </div>
            <div className="cal-lbl">
              {d.habits.length === 0
                ? "Sin hábitos de rutina todavía"
                : done === d.habits.length
                  ? "Rutina completa. Bien ahí."
                  : `Te faltan ${d.habits.length - done}`}
            </div>
          </div>
          <Ring size={84} stroke={9} value={pct / 100} color="var(--amber)" track="var(--amber-tint)" centerFontSize={22}>
            {pct}%
          </Ring>
        </div>

        <div className="cat-habits">
          {d.habits.length === 0 ? (
            <div className="card empty-card">
              <p>Agregá hábitos de rutina: planificar el día, dormir, leer, estudiar.</p>
              <Link className="btn-dark-sm" href="/settings">
                Crear un hábito
              </Link>
            </div>
          ) : (
            <div className="habit-grid">
              {d.habits.map((h) => (
                <HabitCard key={`${d.date}:${h.id}`} habit={h} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
