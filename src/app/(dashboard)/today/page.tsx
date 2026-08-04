import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/data/queries";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { CalendarStrip } from "@/components/modules/CalendarStrip";
import { AreaStrip } from "@/components/modules/AreaStrip";
import { DayCarousel } from "@/components/modules/DayCarousel";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function TodayPage() {
  const d = await getDashboard();
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  const { goals, totals, score, label, level, keyHabits, calendar, checkin } = d;
  const nPct = score.breakdown.nutrition;
  const hPct = score.breakdown.habits;

  return (
    <section className="dash">
      <div className="greet">
        <h1>{greeting()} 👋</h1>
        <p>Nivel {level.level} · racha 🔥 {d.streak}</p>
      </div>

      <CalendarStrip days={calendar} />

      <div className="dash-grid">
        {/* Columna izquierda */}
        <div className="dash-col">
          <div className="card d-hero">
            <Ring size={116} stroke={12} value={score.total / 100} color="var(--ink)" centerFontSize={28}>
              <b style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>{score.total}%</b>
            </Ring>
            <div className="hm">
              <span className="badge">{label}</span>
              <div className="lab">Cumplimiento del día</div>
              <div className="big">{score.total}%</div>
              <div className="foc">
                Foco de hoy:{" "}
                <b>{checkin.focusNote || "definilo en el check‑in ✎"}</b>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="lvl">
              <span className="lv">Nivel {level.level}</span>
              <span className="bar">
                <i style={{ width: `${Math.round((level.inLevel / level.per) * 100)}%` }} />
              </span>
              <span className="xp">
                {level.inLevel} / {level.per} XP
              </span>
            </div>
          </div>

          <AreaStrip breakdown={score.breakdown} />
        </div>

        {/* Columna derecha: carrusel */}
        <div className="dash-col">
          <DayCarousel>
            {/* Card nutrición */}
            <div className="dcard">
              <h3>
                Nutrición <span style={{ color: nPct >= 0 ? "var(--red)" : "var(--muted)" }}>{nPct >= 0 ? nPct + "%" : "—"}</span>
              </h3>
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
                <div className="dc-mcell">
                  <div className="mr">
                    <Ring size={56} stroke={7} value={goals.protein ? totals.protein / goals.protein : 0} color="var(--red)" track="var(--red-tint)" centerFontSize={17}>
                      🍗
                    </Ring>
                  </div>
                  <div className="mv">{nf(totals.protein)}<small>/{nf(goals.protein)}</small></div>
                  <div className="ml2">Proteína</div>
                </div>
                <div className="dc-mcell">
                  <div className="mr">
                    <Ring size={56} stroke={7} value={goals.carbs ? totals.carbs / goals.carbs : 0} color="var(--amber)" track="var(--amber-tint)" centerFontSize={17}>
                      🌾
                    </Ring>
                  </div>
                  <div className="mv">{nf(totals.carbs)}<small>/{nf(goals.carbs)}</small></div>
                  <div className="ml2">Carbos</div>
                </div>
                <div className="dc-mcell">
                  <div className="mr">
                    <Ring size={56} stroke={7} value={goals.fat ? totals.fat / goals.fat : 0} color="var(--blue)" track="var(--blue-tint)" centerFontSize={17}>
                      🥑
                    </Ring>
                  </div>
                  <div className="mv">{nf(totals.fat)}<small>/{nf(goals.fat)}</small></div>
                  <div className="ml2">Grasa</div>
                </div>
              </div>
            </div>

            {/* Card hábitos clave */}
            <div className="dcard">
              <h3>
                Hábitos clave <span style={{ color: hPct >= 0 ? "var(--text)" : "var(--muted)" }}>{hPct >= 0 ? hPct + "%" : "—"}</span>
              </h3>
              {keyHabits.length === 0 ? (
                <div className="empty-mini">Configurá hábitos con objetivo (agua, pasos, sueño) en el onboarding.</div>
              ) : (
                keyHabits.map((h) => (
                  <div key={h.id} className="khrow">
                    <div className="kr">
                      <Ring size={44} stroke={6} value={h.pct / 100} color="var(--ink)" track="var(--surface-2)" centerFontSize={16}>
                        {h.emoji}
                      </Ring>
                    </div>
                    <div className="kn">
                      <div className="n">{h.name}</div>
                      <div className="s">objetivo {nf(h.target, h.unit === "L" ? 1 : 0)} {h.unit}</div>
                    </div>
                    <div className="kv">
                      {nf(h.value, h.unit === "L" ? 1 : 0)} {h.unit}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Card foco & tareas (placeholder hasta el módulo Trabajo) */}
            <div className="dcard">
              <h3>
                Foco &amp; tareas <span style={{ color: "var(--muted)" }}>pronto</span>
              </h3>
              <div className="khrow">
                <div className="kr">
                  <Ring size={44} stroke={6} value={0} color="var(--ink)" track="var(--surface-2)" centerFontSize={16}>
                    ⏱
                  </Ring>
                </div>
                <div className="kn">
                  <div className="n">Trabajo profundo</div>
                  <div className="s">{checkin.focusNote ? checkin.focusNote : "definí tu foco en el check‑in"}</div>
                </div>
                <div className="kv" style={{ color: "var(--muted)" }}>—</div>
              </div>
              <div className="empty-mini" style={{ textAlign: "left" }}>
                El módulo de tareas, proyectos y pomodoro llega en la próxima fase.
              </div>
            </div>
          </DayCarousel>
        </div>
      </div>
    </section>
  );
}
