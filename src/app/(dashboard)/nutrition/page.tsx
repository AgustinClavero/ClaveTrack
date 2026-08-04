import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getNutritionDay, getHabitsDay, MEAL_LABEL } from "@/lib/data/queries";
import { mealTotals } from "@/lib/calculations/macros";
import { nf } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { MacroCard } from "@/components/modules/MacroCard";
import { MealRow } from "@/components/modules/MealRow";
import { AddMealButton } from "@/components/modules/AddMealButton";
import { HabitCard } from "@/components/modules/HabitCard";
import { PageDate } from "@/components/shell/PageDate";
import { SupplementCard } from "@/components/modules/SupplementCard";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const [d, habitsData] = await Promise.all([getNutritionDay(), getHabitsDay(["nutrition"])]);
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  const { goals, meals, totals } = d;
  const remaining = Math.max(0, goals.kcal - totals.kcal);
  const allHabits = habitsData?.habits ?? [];
  const supplements = allHabits.filter((h) => h.groupKey === "supplements");
  const otherHabits = allHabits.filter((h) => h.groupKey !== "supplements");

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Nutrición</h1>
          <PageDate date={d.date} timezone={d.timezone} />
        </div>
        <Link href="/settings" className="head-action">
          <Settings size={17} />
          <span>Objetivos</span>
        </Link>
      </header>

      <div className="nut-grid">
        {/* Calorías: número protagonista + anillo */}
        <div className="card cal-hero">
          <div>
            <div className="cal-num">
              {nf(totals.kcal)}
              <small>/{nf(goals.kcal)}</small>
            </div>
            <div className="cal-lbl">Calorías · faltan {nf(remaining)}</div>
          </div>
          <Ring size={92} stroke={10} value={goals.kcal ? totals.kcal / goals.kcal : 0} color="var(--ink)" centerFontSize={26}>
            🔥
          </Ring>
        </div>

        {/* Macros como cards separadas (referencia Cal AI) */}
        <div className="macro-cards">
          <MacroCard label="Proteína" value={totals.protein} goal={goals.protein} emoji="🍗" color="var(--red)" tint="var(--red-tint)" />
          <MacroCard label="Carbos" value={totals.carbs} goal={goals.carbs} emoji="🌾" color="var(--amber)" tint="var(--amber-tint)" />
          <MacroCard label="Grasa" value={totals.fat} goal={goals.fat} emoji="🥑" color="var(--blue)" tint="var(--blue-tint)" />
        </div>

        <SupplementCard items={supplements} />

        {otherHabits.length > 0 && (
          <div className="cat-habits">
            <div className="sec-head">
              <span className="eyebrow">Hábitos de alimentación</span>
            </div>
            <div className="habit-grid">
              {otherHabits.map((h) => (
                <HabitCard key={h.id} habit={h} />
              ))}
            </div>
          </div>
        )}

        <div className="nut-meals">
          <div className="sec-head">
            <span className="eyebrow">Registrado hoy</span>
            <AddMealButton />
          </div>

          {meals.length === 0 ? (
            <div className="card empty-card">
              <p>Todavía no registraste nada hoy.</p>
              <AddMealButton variant="solid" label="Registrar mi primera comida" />
            </div>
          ) : (
            <div className="stack-sm">
              {meals.map((m) => {
                const t = mealTotals(m);
                return (
                  <MealRow
                    key={m.id}
                    id={m.id}
                    label={MEAL_LABEL[m.type]}
                    emoji={m.emoji ?? "🍽"}
                    time={m.time}
                    kcal={t.kcal}
                    protein={t.protein}
                    carbs={t.carbs}
                    fat={t.fat}
                    photoUrl={m.photoUrl}
                    items={m.items.map((i) => i.foodName)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
