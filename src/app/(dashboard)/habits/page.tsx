import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getHabitsDay } from "@/lib/data/queries";
import { HabitCard } from "@/components/modules/HabitCard";
import { Ring } from "@/components/ui/Ring";
import type { HabitCategory } from "@/types";

export const dynamic = "force-dynamic";

const GROUPS: { key: HabitCategory; label: string; emoji: string; href: string }[] = [
  { key: "nutrition", label: "Nutrición", emoji: "🍽", href: "/nutrition" },
  { key: "activity", label: "Movimiento", emoji: "🏃", href: "/activity" },
  { key: "routine", label: "Rutina", emoji: "🗓", href: "/routine" },
  { key: "mind", label: "Mente", emoji: "🧠", href: "/routine" },
];

export default async function HabitsPage() {
  const d = await getHabitsDay();
  if (!d) redirect("/login");

  const done = d.habits.filter((h) => h.done).length;
  const pct = d.habits.length ? Math.round((done / d.habits.length) * 100) : 0;

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Registro de hábitos</h1>
          <p className="screen-sub">
            {done} de {d.habits.length} hoy · el día cuenta para la racha desde {d.threshold}%
          </p>
        </div>
        <Link href="/settings" className="head-action">
          <Settings size={17} />
          <span>Gestionar</span>
        </Link>
      </header>

      <div className="nut-grid">
        <div className="card cal-hero">
          <div>
            <span className="eyebrow">Cumplidos hoy</span>
            <div className="cal-num">
              {done}
              <small>/{d.habits.length}</small>
            </div>
            <div className="cal-lbl">
              {d.habits.length === 0
                ? "Todavía no tenés hábitos"
                : done === d.habits.length
                  ? "Todos marcados. Impecable."
                  : `Te faltan ${d.habits.length - done}`}
            </div>
          </div>
          <Ring size={84} stroke={9} value={pct / 100} color="var(--ink)" centerFontSize={22}>
            {pct}%
          </Ring>
        </div>

        {d.habits.length === 0 ? (
          <div className="cat-habits">
            <div className="card empty-card">
              <p>Creá tu primer hábito y empezá a registrarlo hoy mismo.</p>
              <Link className="btn-dark-sm" href="/settings">
                Crear un hábito
              </Link>
            </div>
          </div>
        ) : (
          GROUPS.map((g) => {
            const items = d.habits.filter((h) => h.category === g.key);
            if (items.length === 0) return null;
            return (
              <div className="cat-habits" key={g.key}>
                <div className="sec-head">
                  <span className="eyebrow">
                    {g.emoji} {g.label}
                  </span>
                  <Link href={g.href} className="dc-link">
                    Ir a {g.label}
                  </Link>
                </div>
                <div className="habit-grid">
                  {items.map((h) => (
                    <HabitCard key={h.id} habit={h} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
