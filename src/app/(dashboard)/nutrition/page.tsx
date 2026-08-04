import { getToday } from "@/lib/data/mock";
import { dayTotals, mealTotals } from "@/lib/calculations/macros";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { MacroRing } from "@/components/modules/MacroRing";

const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  colacion: "Colación",
  bebida: "Bebida",
};

export default async function NutritionPage() {
  const { goals, meals } = await getToday();
  const totals = dayTotals(meals);
  const remaining = goals.kcal - totals.kcal;

  return (
    <section className="screen">
      <div className="screen-title">Nutrición</div>
      <div className="stack" style={{ marginTop: 14 }}>
        <div className="card cal-card">
          <div>
            <div className="cal-num">
              {nf(totals.kcal)}
              <small> /{nf(goals.kcal)}</small>
            </div>
            <div className="cal-lbl">Calorías · faltan {nf(remaining)}</div>
          </div>
          <Ring size={88} stroke={9} value={totals.kcal / goals.kcal} color="var(--ink)">
            🔥
          </Ring>
        </div>

        <div className="macros">
          <MacroRing label="Proteína" value={totals.protein} goal={goals.protein} emoji="🍗" color="var(--red)" tint="var(--red-tint)" />
          <MacroRing label="Carbos" value={totals.carbs} goal={goals.carbs} emoji="🌾" color="var(--amber)" tint="var(--amber-tint)" />
          <MacroRing label="Grasa" value={totals.fat} goal={goals.fat} emoji="🥑" color="var(--blue)" tint="var(--blue-tint)" />
        </div>

        <div className="sec-label" style={{ margin: "8px 4px 0" }}>
          Comidas de hoy
        </div>
        {meals.map((m) => {
          const t = mealTotals(m);
          const names = m.items.map((i) => i.foodName).join(" · ");
          return (
            <div key={m.id} className="meal-item">
              <div className="thumb" style={{ background: "var(--surface-2)" }}>
                {m.emoji ?? "🍽"}
              </div>
              <div className="mi">
                <div className="mt">
                  <span className="name">{MEAL_LABEL[m.type]}</span>
                  <span className="time">{nf(t.kcal)} kcal</span>
                </div>
                <div className="mi-macros" style={{ marginTop: 4 }}>
                  <span>{names}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="meal-item" style={{ borderStyle: "dashed", opacity: 0.85 }}>
          <div className="thumb" style={{ background: "var(--surface-2)" }}>
            ＋
          </div>
          <div className="mi">
            <div className="mt">
              <span className="name" style={{ color: "var(--muted)" }}>
                Cena — sin registrar
              </span>
            </div>
            <div className="mi-macros" style={{ marginTop: 4 }}>
              <span>Tocá para agregar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
