import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getNutritionDay } from "@/lib/data/queries";
import { mealTotals } from "@/lib/calculations/macros";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { MacroRing } from "@/components/modules/MacroRing";
import { MealRow } from "@/components/modules/MealRow";
import { AddMealButton } from "@/components/modules/AddMealButton";
import { WaterTracker } from "@/components/modules/WaterTracker";

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
  const d = await getNutritionDay();
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  const { goals, meals, totals } = d;
  const remaining = Math.max(0, goals.kcal - totals.kcal);

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Nutrición</h1>
          <p className="screen-sub">
            {meals.length === 0 ? "Sin comidas todavía" : `${meals.length} ${meals.length === 1 ? "comida" : "comidas"} hoy`}
          </p>
        </div>
        <Link href="/settings" className="head-action">
          <Settings size={17} />
          <span>Objetivos</span>
        </Link>
      </header>

      <div className="nut-grid">
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

        <WaterTracker waterMl={d.waterMl} goalMl={goals.waterMl} />

        <div className="nut-meals">
          <div className="sec-head">
            <span className="eyebrow">Comidas de hoy</span>
            <AddMealButton />
          </div>

          {meals.length === 0 ? (
            <div className="card empty-card">
              <p>Todavía no registraste nada hoy.</p>
              <AddMealButton variant="solid" label="Registrar mi primera comida" />
            </div>
          ) : (
            <div className="stack-sm">
              {meals.map((m) => (
                <MealRow
                  key={m.id}
                  id={m.id}
                  label={MEAL_LABEL[m.type]}
                  emoji={m.emoji ?? "🍽"}
                  time={m.time}
                  kcal={mealTotals(m).kcal}
                  items={m.items.map((i) => i.foodName)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
