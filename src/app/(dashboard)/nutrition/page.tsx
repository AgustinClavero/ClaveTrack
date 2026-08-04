import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/data/queries";
import { dayTotals, mealTotals } from "@/lib/calculations/macros";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { MacroRing } from "@/components/modules/MacroRing";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  colacion: "Colación",
  bebida: "Bebida",
};

export default async function NutritionPage() {
  const d = await getDashboard();
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  const { goals, meals } = d;
  const totals = dayTotals(meals);
  const remaining = Math.max(0, goals.kcal - totals.kcal);

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
          <Ring size={88} stroke={9} value={goals.kcal ? totals.kcal / goals.kcal : 0} color="var(--ink)">
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
        {meals.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
            Sin comidas registradas. Tocá <b>+</b> para agregar la primera.
          </div>
        ) : (
          meals.map((m) => {
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
          })
        )}
      </div>
    </section>
  );
}
