import { getToday } from "@/lib/data/mock";
import { dayTotals } from "@/lib/calculations/macros";
import { scoreLabel } from "@/lib/calculations/scoring";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { WeekStrip } from "@/components/modules/WeekStrip";
import { MacroRing } from "@/components/modules/MacroRing";
import { QuickButtons } from "@/components/modules/QuickButtons";

const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  colacion: "Colación",
  bebida: "Bebida",
};

export default async function TodayPage() {
  const { goals, meals, score } = await getToday();
  const totals = dayTotals(meals);
  const label = scoreLabel(score);

  return (
    <section className="screen">
      <WeekStrip />

      <div className="cols">
        <div className="stack">
          {/* Calorías */}
          <div className="card cal-card">
            <div>
              <div className="cal-num">
                {nf(totals.kcal)}
                <small> /{nf(goals.kcal)}</small>
              </div>
              <div className="cal-lbl">Calorías de hoy</div>
            </div>
            <Ring size={96} stroke={9} value={totals.kcal / goals.kcal} color="var(--ink)">
              🔥
            </Ring>
          </div>

          {/* Macros */}
          <div className="macros">
            <MacroRing label="Proteína" value={totals.protein} goal={goals.protein} emoji="🍗" color="var(--red)" tint="var(--red-tint)" />
            <MacroRing label="Carbos" value={totals.carbs} goal={goals.carbs} emoji="🌾" color="var(--amber)" tint="var(--amber-tint)" />
            <MacroRing label="Grasa" value={totals.fat} goal={goals.fat} emoji="🥑" color="var(--blue)" tint="var(--blue-tint)" />
          </div>

          {/* Cumplimiento */}
          <div className="card">
            <div className="score-row">
              <Ring size={78} stroke={8} value={score / 100} color="var(--ink)" centerFontSize={19}>
                <b style={{ fontWeight: 800 }}>{score}</b>
              </Ring>
              <div className="st">
                <span className="badge">{label}</span>
                <h2>Cumplimiento {score}%</h2>
                <p>Te falta poco para cerrar el día por encima del umbral.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div>
            <div className="sec-label" style={{ marginTop: 0 }}>
              Registrado hoy
            </div>
            {[...meals].reverse().map((m) => {
              const kcal = m.items.reduce((a, i) => a + i.macros.kcal, 0);
              const p = m.items.reduce((a, i) => a + i.macros.protein, 0);
              const c = m.items.reduce((a, i) => a + i.macros.carbs, 0);
              const f = m.items.reduce((a, i) => a + i.macros.fat, 0);
              return (
                <div key={m.id} className="meal-item">
                  <div className="thumb" style={{ background: "var(--surface-2)" }}>
                    {m.emoji ?? "🍽"}
                  </div>
                  <div className="mi">
                    <div className="mt">
                      <span className="name">{MEAL_LABEL[m.type]}</span>
                      <span className="time">{m.time}</span>
                    </div>
                    <div className="kc">
                      🔥 {nf(kcal)} kcal{" "}
                      <span className={m.planned ? "tag-pl" : "tag-im tag-pl"}>
                        {m.planned ? "planificado" : "improvisado"}
                      </span>
                    </div>
                    <div className="mi-macros">
                      <span>🍗 {nf(p)}g</span>
                      <span>🌾 {nf(c)}g</span>
                      <span>🥑 {nf(f)}g</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ background: "var(--surface-2)", borderColor: "transparent" }}>
            <div style={{ fontSize: 14.5 }}>
              <b>Recomendación de hoy.</b> Te quedan {nf(goals.protein - totals.protein)} g de proteína y{" "}
              {nf(goals.kcal - totals.kcal)} kcal. Un yogur griego con avena te deja cómodo para la cena.
            </div>
          </div>
        </div>
      </div>

      <QuickButtons />
    </section>
  );
}
