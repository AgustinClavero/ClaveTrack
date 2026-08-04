import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getHabitsDay } from "@/lib/data/queries";
import { HabitList } from "@/components/modules/HabitList";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const d = await getHabitsDay();
  if (!d) redirect("/login");

  const done = d.habits.filter((h) => h.done).length;
  const pct = d.habits.length ? Math.round((done / d.habits.length) * 100) : 0;

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Hábitos</h1>
          <p className="screen-sub">
            {done} de {d.habits.length} hoy · {pct}%
          </p>
        </div>
        <Link href="/settings" className="head-action">
          <Settings size={17} />
          <span>Gestionar</span>
        </Link>
      </header>

      <div className="stack">
        <HabitList initial={d.habits} />
        <p className="note">
          Tocá el círculo para marcar, o usá + / − en los que llevan cantidad. El día cuenta para la racha si superás
          el {d.threshold}%.
        </p>
      </div>
    </section>
  );
}
