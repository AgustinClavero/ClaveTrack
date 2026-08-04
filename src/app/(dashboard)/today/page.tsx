import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboard } from "@/lib/data/queries";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { CalendarStrip } from "@/components/modules/CalendarStrip";
import { AreaStrip } from "@/components/modules/AreaStrip";
import { AddMealButton } from "@/components/modules/AddMealButton";
import { FocusEditor } from "@/components/modules/FocusEditor";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Mensaje del héroe: concreto y accionable, nunca moralizante. */
function heroHint(score: number, hasData: boolean, pendingHabits: number, mealsCount: number) {
  if (!hasData) return "Registrá algo del día y tu cumplimiento arranca.";
  if (mealsCount === 0) return "Todavía no registraste comidas de hoy.";
  if (pendingHabits > 0) return `Te quedan ${pendingHabits} ${pendingHabits === 1 ? "hábito" : "hábitos"} por marcar.`;
  if (score >= 90) return "Día redondo. Así se construye la racha.";
  return "Vas bien. Sumá lo que falte cuando puedas.";
}

export default async function TodayPage() {
  const d = await getDashboard();
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  const { goals, totals, score, label, level, keyHabits, calendar, checkin, habits, meals } = d;
  const nPct = score.breakdown.nutrition;
  const pendingHabits = habits.filter((h) => !h.done).length;
  const hasData = score.activeAreas.length > 0;
  const levelPct = Math.round((level.inLevel / level.per) * 100);

  return (
    <section className="dash">
      <header className="greet">
        <h1>{greeting()} 👋</h1>
        <p>
          Nivel {level.level} · racha 🔥 {d.streak}
        </p>
      </header>

      <CalendarStrip days={calendar} />

      <div className="dash-grid">
        {/* Héroe: cumplimiento del día */}
        <div className="card d-hero">
          <Ring size={116} stroke={12} value={score.total / 100} color="var(--ink)" centerFontSize={28}>
            <b className="num">{score.total}%</b>
          </Ring>
          <div className="hm">
            <span className="badge">{label}</span>
            <div className="eyebrow">Cumplimiento del día</div>
            <div className="big">{score.total}%</div>
            <p className="hero-hint">{heroHint(score.total, hasData, pendingHabits, meals.length)}</p>
            <FocusEditor focus={checkin.focusNote} />
          </div>
        </div>

        {/* Nivel / XP / racha */}
        <div className="card lvl-card">
          <div className="dc-head">
            <span className="eyebrow">Tu constancia</span>
            <span className="lv-badge">Nivel {level.level}</span>
          </div>
          <div className="lv-bar">
            <i style={{ width: `${levelPct}%` }} />
          </div>
          <div className="lv-meta">
            <span>
              {level.inLevel} / {level.per} XP
            </span>
            <span>faltan {level.per - level.inLevel} para el nivel {level.level + 1}</span>
          </div>
          <div className="lv-stats">
            <div>
              <b>🔥 {d.streak}</b>
              <span>días de racha</span>
            </div>
            <div>
              <b>{calendar.filter((c) => c.score != null).length}</b>
              <span>días con registro</span>
            </div>
          </div>
        </div>

        {/* Áreas */}
        <AreaStrip breakdown={score.breakdown} />

        {/* Nutrición */}
        <div className="card dcard">
          <div className="dc-head">
            <span className="eyebrow">Nutrición</span>
            <span className="dc-pct">{nPct >= 0 ? nPct + "%" : "—"}</span>
          </div>
          <div className="dc-cal">
            <div>
              <div className="cal-num">
                {nf(totals.kcal)}
                <small> /{nf(goals.kcal)}</small>
              </div>
              <div className="cal-lbl">Calorías · faltan {nf(Math.max(0, goals.kcal - totals.kcal))}</div>
            </div>
            <Ring size={72} stroke={8} value={goals.kcal ? totals.kcal / goals.kcal : 0} color="var(--ink)" centerFontSize={20}>
              🔥
            </Ring>
          </div>
          <div className="dc-mrow">
            {[
              { l: "Proteína", v: totals.protein, g: goals.protein, e: "🍗", c: "var(--red)", t: "var(--red-tint)" },
              { l: "Carbos", v: totals.carbs, g: goals.carbs, e: "🌾", c: "var(--amber)", t: "var(--amber-tint)" },
              { l: "Grasa", v: totals.fat, g: goals.fat, e: "🥑", c: "var(--blue)", t: "var(--blue-tint)" },
            ].map((m) => (
              <div className="dc-mcell" key={m.l}>
                <div className="mr">
                  <Ring size={56} stroke={7} value={m.g ? m.v / m.g : 0} color={m.c} track={m.t} centerFontSize={17}>
                    {m.e}
                  </Ring>
                </div>
                <div className="mv">
                  {nf(m.v)}
                  <small>/{nf(m.g)}</small>
                </div>
                <div className="ml2">{m.l}</div>
              </div>
            ))}
          </div>
          <div className="dc-foot">
            <AddMealButton label="Registrar comida" />
          </div>
        </div>

        {/* Hábitos clave */}
        <div className="card dcard">
          <div className="dc-head">
            <span className="eyebrow">Hábitos clave</span>
            <Link href="/habits" className="dc-link">
              Ver todos
            </Link>
          </div>
          {keyHabits.length === 0 ? (
            <div className="empty-mini">
              Marcá hábitos como &quot;clave&quot; en <Link href="/settings">Ajustes</Link> para verlos acá.
            </div>
          ) : (
            keyHabits.map((h) => {
              const pct = h.target ? Math.min(100, Math.round((h.value / h.target) * 100)) : h.done ? 100 : 0;
              const dec = h.unit.toLowerCase() === "l" || h.unit.toLowerCase() === "h" ? 1 : 0;
              return (
                <div key={h.id} className="khrow">
                  <div className="kr">
                    <Ring size={44} stroke={6} value={pct / 100} color="var(--ink)" track="var(--surface-2)" centerFontSize={16}>
                      {h.emoji}
                    </Ring>
                  </div>
                  <div className="kn">
                    <div className="n">{h.name}</div>
                    <div className="s">
                      objetivo {nf(h.target ?? 0, dec)} {h.unit}
                    </div>
                  </div>
                  <div className="kv">
                    {nf(h.value, dec)} {h.unit}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pendientes del día */}
        <div className="card dcard">
          <div className="dc-head">
            <span className="eyebrow">Pendientes de hoy</span>
            <span className="dc-pct">{pendingHabits}</span>
          </div>
          {pendingHabits === 0 ? (
            <div className="empty-mini">Todo marcado por hoy. 🎯</div>
          ) : (
            <ul className="todo-list">
              {habits
                .filter((h) => !h.done)
                .slice(0, 5)
                .map((h) => (
                  <li key={h.id}>
                    <span aria-hidden="true">{h.emoji}</span>
                    {h.name}
                  </li>
                ))}
            </ul>
          )}
          <div className="dc-foot">
            <Link href="/habits" className="head-action">
              Ir a hábitos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
