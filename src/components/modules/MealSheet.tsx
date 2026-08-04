"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { searchFoods, logMeal, createFood, type FoodHit } from "@/app/actions";
import { nf } from "@/lib/utils";

const MEAL_TYPES = [
  { v: "desayuno", l: "Desayuno" },
  { v: "almuerzo", l: "Almuerzo" },
  { v: "merienda", l: "Merienda" },
  { v: "cena", l: "Cena" },
  { v: "colacion", l: "Colación" },
  { v: "bebida", l: "Bebida" },
] as const;

interface Draft {
  food: FoodHit;
  quantity: number;
}

const BASE_QTY: Record<string, number> = { "100g": 100, "100ml": 100, unidad: 1 };
const unitOf = (base: string) => (base === "unidad" ? "un" : base === "100ml" ? "ml" : "g");

/** Sugiere el tipo de comida según la hora local. */
function suggestMealType(): (typeof MEAL_TYPES)[number]["v"] {
  const h = new Date().getHours();
  if (h < 11) return "desayuno";
  if (h < 15) return "almuerzo";
  if (h < 19) return "merienda";
  return "cena";
}

export function MealSheet() {
  const open = useUIStore((s) => s.activeSheet === "meal");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [mealType, setMealType] = useState<string>("almuerzo");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [items, setItems] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewFood, setShowNewFood] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMealType(suggestMealType());
    setItems([]);
    setQuery("");
    setError(null);
    setShowNewFood(false);
  }, [open]);

  // Búsqueda con debounce.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const res = await searchFoods(query);
      if (res.ok) setHits(res.data);
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  function addFood(food: FoodHit) {
    const def = food.base === "unidad" ? 1 : 100;
    setItems((it) => [...it, { food, quantity: def }]);
    setQuery("");
  }

  function setQty(idx: number, q: number) {
    setItems((it) => it.map((d, i) => (i === idx ? { ...d, quantity: Math.max(0, q) } : d)));
  }

  const totals = items.reduce(
    (acc, d) => {
      const f = d.quantity / BASE_QTY[d.food.base];
      return {
        kcal: acc.kcal + d.food.kcal * f,
        protein: acc.protein + d.food.proteinG * f,
        carbs: acc.carbs + d.food.carbsG * f,
        fat: acc.fat + d.food.fatG * f,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  function save() {
    if (items.length === 0) {
      setError("Agregá al menos un alimento.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await logMeal({
        mealType,
        items: items.map((d) => ({ kind: "food" as const, foodId: d.food.id, quantity: d.quantity })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeSheet();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={closeSheet} title="Registrar comida" className="meal-sheet">
      <div className="chip-row" role="group" aria-label="Tipo de comida">
        {MEAL_TYPES.map((m) => (
          <button
            key={m.v}
            className={`chip${mealType === m.v ? " on" : ""}`}
            onClick={() => setMealType(m.v)}
            aria-pressed={mealType === m.v}
          >
            {m.l}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="ms-items">
          {items.map((d, i) => (
            <div className="ms-item" key={`${d.food.id}-${i}`}>
              <div className="ms-in">
                <div className="n">{d.food.name}</div>
                <div className="s">
                  {nf((d.food.kcal * d.quantity) / BASE_QTY[d.food.base])} kcal ·{" "}
                  {nf((d.food.proteinG * d.quantity) / BASE_QTY[d.food.base], 1)} g P
                </div>
              </div>
              <div className="ms-qty">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={d.quantity}
                  onChange={(e) => setQty(i, Number(e.target.value))}
                  aria-label={`Cantidad de ${d.food.name}`}
                />
                <span>{unitOf(d.food.base)}</span>
              </div>
              <button
                className="ms-del"
                onClick={() => setItems((it) => it.filter((_, j) => j !== i))}
                aria-label={`Quitar ${d.food.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="ms-total">
            <b>{nf(totals.kcal)} kcal</b>
            <span>
              P {nf(totals.protein, 1)} · C {nf(totals.carbs, 1)} · G {nf(totals.fat, 1)}
            </span>
          </div>
        </div>
      )}

      <div className="ms-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar alimento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar alimento"
        />
      </div>

      <div className="ms-hits">
        {hits.length === 0 && query ? (
          <div className="ms-empty">
            Sin resultados.
            <button className="linkish" onClick={() => setShowNewFood(true)}>
              Crear &quot;{query}&quot;
            </button>
          </div>
        ) : (
          hits.map((f) => (
            <button key={f.id} className="ms-hit" onClick={() => addFood(f)}>
              <span className="n">{f.name}</span>
              <span className="s">
                {nf(f.kcal)} kcal / {f.base === "unidad" ? "un" : f.base}
              </span>
              <Plus size={16} />
            </button>
          ))
        )}
      </div>

      {showNewFood && <NewFoodForm initialName={query} onCreated={(f) => { addFood(f); setShowNewFood(false); }} />}

      {error && <p className="form-error">{error}</p>}

      <button className="ci-save" onClick={save} disabled={pending || items.length === 0}>
        {pending ? "Guardando…" : `Registrar ${items.length > 0 ? `(${nf(totals.kcal)} kcal)` : ""}`}
      </button>
    </Sheet>
  );
}

function NewFoodForm({ initialName, onCreated }: { initialName: string; onCreated: (f: FoodHit) => void }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: initialName,
    base: "100g",
    kcal: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });

  const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await createFood({
        name: f.name,
        base: f.base,
        kcal: num(f.kcal),
        proteinG: num(f.proteinG),
        carbsG: num(f.carbsG),
        fatG: num(f.fatG),
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onCreated(res.data);
    });
  }

  return (
    <div className="nf-form">
      <div className="nf-title">Nuevo alimento</div>
      <input className="ci-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nombre" />
      <div className="chip-row" style={{ marginTop: 10 }}>
        {["100g", "100ml", "unidad"].map((b) => (
          <button key={b} className={`chip${f.base === b ? " on" : ""}`} onClick={() => setF({ ...f, base: b })}>
            por {b}
          </button>
        ))}
      </div>
      <div className="nf-grid">
        {([["kcal", "kcal"], ["proteinG", "Proteína g"], ["carbsG", "Carbos g"], ["fatG", "Grasa g"]] as const).map(([k, l]) => (
          <label key={k}>
            <span>{l}</span>
            <input
              className="ci-input"
              inputMode="decimal"
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      {err && <p className="form-error">{err}</p>}
      <button className="btn-dark-sm" onClick={submit} disabled={pending || !f.name.trim()}>
        {pending ? "Creando…" : "Crear y agregar"}
      </button>
    </div>
  );
}
