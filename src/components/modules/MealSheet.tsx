"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Camera, Minus, Plus, Search, Star, Trash2, X } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import {
  getFoodPickerData,
  logMeal,
  logRecipe,
  searchFoods,
  toggleFoodFavorite,
  type FoodHit,
  type FoodPickerData,
} from "@/app/actions";
import { uploadMealPhoto } from "@/lib/upload";
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
  /** Siempre en gramos o ml: la unidad es solo una forma de contar. */
  grams: number;
}

/** Macros de una cantidad en gramos (el catálogo está por 100 g). */
const macrosOf = (f: FoodHit, grams: number) => {
  const k = grams / 100;
  return { kcal: f.kcal * k, protein: f.proteinG * k, carbs: f.carbsG * k, fat: f.fatG * k };
};

function suggestMealType(): (typeof MEAL_TYPES)[number]["v"] {
  const h = new Date().getHours();
  if (h < 11) return "desayuno";
  if (h < 15) return "almuerzo";
  if (h < 19) return "merienda";
  return "cena";
}

const unitOf = (f: FoodHit) => (f.base === "100ml" ? "ml" : "g");

export function MealSheet({ proteinToday = 0, proteinGoal = 0 }: { proteinToday?: number; proteinGoal?: number }) {
  const open = useUIStore((s) => s.activeSheet === "meal");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [mealType, setMealType] = useState<string>("almuerzo");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [picker, setPicker] = useState<FoodPickerData | null>(null);
  const [items, setItems] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFood, setPendingFood] = useState<FoodHit | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMealType(suggestMealType());
    setItems([]);
    setQuery("");
    setError(null);
    setPhoto(null);
    setPendingFood(null);
    getFoodPickerData().then((r) => r.ok && setPicker(r.data));
  }, [open]);

  // Búsqueda con debounce; sin texto no se consulta (se muestran favoritos).
  useEffect(() => {
    if (!open || !query.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await searchFoods(query);
      if (res.ok) setHits(res.data);
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  async function onPickPhoto(file: File) {
    setError(null);
    setUploading(true);
    const res = await uploadMealPhoto(file);
    setUploading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPhoto({ path: res.path, preview: URL.createObjectURL(file) });
  }

  function addDraft(food: FoodHit, grams: number) {
    setItems((it) => [...it, { food, grams }]);
    setPendingFood(null);
    setQuery("");
  }

  async function favorite(f: FoodHit, e: React.MouseEvent) {
    e.stopPropagation();
    const next = !f.isFavorite;
    setHits((hs) => hs.map((x) => (x.id === f.id ? { ...x, isFavorite: next } : x)));
    setPicker((p) =>
      p
        ? {
            ...p,
            favorites: next ? [...p.favorites, { ...f, isFavorite: true }] : p.favorites.filter((x) => x.id !== f.id),
            recent: p.recent.map((x) => (x.id === f.id ? { ...x, isFavorite: next } : x)),
          }
        : p
    );
    await toggleFoodFavorite({ foodId: f.id, favorite: next });
  }

  const totals = items.reduce(
    (acc, d) => {
      const m = macrosOf(d.food, d.grams);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
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
        photoPath: photo?.path ?? null,
        items: items.map((d) => ({ kind: "food" as const, foodId: d.food.id, quantity: d.grams })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeSheet();
      router.refresh();
    });
  }

  function useRecipe(recipeId: string) {
    setError(null);
    startTransition(async () => {
      const res = await logRecipe({ recipeId, mealType });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeSheet();
      router.refresh();
    });
  }

  // Paso 2: cantidad del alimento elegido.
  if (pendingFood) {
    return (
      <Sheet open={open} onClose={closeSheet} title="" className="meal-sheet qty-sheet">
        <QuantityStep
          food={pendingFood}
          onBack={() => setPendingFood(null)}
          onConfirm={(grams) => addDraft(pendingFood, grams)}
        />
      </Sheet>
    );
  }

  const proteinAfter = proteinToday + totals.protein;
  const proteinPct = proteinGoal ? Math.min(100, (proteinAfter / proteinGoal) * 100) : 0;

  return (
    <Sheet open={open} onClose={closeSheet} title="Registrar comida" className="meal-sheet">
      {/* Progreso de proteína mientras se arma la comida */}
      {proteinGoal > 0 && (
        <div className="ms-macrobar">
          <div className="mb-top">
            <span className="eyebrow">Proteína</span>
            <b>
              {nf(proteinAfter)} <small>/ {nf(proteinGoal)} g</small>
            </b>
          </div>
          <div className="mb-track">
            <i style={{ width: `${(proteinToday / (proteinGoal || 1)) * 100}%` }} />
            <u style={{ width: `${proteinPct - (proteinToday / (proteinGoal || 1)) * 100}%` }} />
          </div>
        </div>
      )}

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

      {/* Lo que ya se agregó */}
      {items.length > 0 && (
        <div className="ms-items">
          {items.map((d, i) => {
            const m = macrosOf(d.food, d.grams);
            return (
              <div className="ms-item" key={`${d.food.id}-${i}`}>
                <div className="ms-in">
                  <div className="n">{d.food.name}</div>
                  <div className="s">
                    {nf(d.grams)} {unitOf(d.food)} · {nf(m.kcal)} kcal · {nf(m.protein, 1)} g P
                  </div>
                </div>
                <button className="ms-del" onClick={() => setItems((it) => it.filter((_, j) => j !== i))} aria-label={`Quitar ${d.food.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          <div className="ms-total">
            <b>{nf(totals.kcal)} kcal</b>
            <span>
              P {nf(totals.protein, 1)} · C {nf(totals.carbs, 1)} · G {nf(totals.fat, 1)}
            </span>
          </div>
        </div>
      )}

      {/* Buscador siempre arriba */}
      <div className="ms-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar alimento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar alimento"
        />
        {query && (
          <button className="ms-clear" onClick={() => setQuery("")} aria-label="Limpiar">
            <X size={15} />
          </button>
        )}
      </div>

      {query ? (
        <div className="ms-hits">
          {hits.length === 0 ? (
            <div className="ms-empty">Sin resultados para “{query}”.</div>
          ) : (
            hits.map((f) => <FoodRow key={f.id} food={f} onPick={setPendingFood} onFav={favorite} />)
          )}
        </div>
      ) : (
        <>
          {picker?.recipes.length ? (
            <section className="ms-group">
              <span className="eyebrow">⭐ Mis recetas</span>
              <div className="ms-recipes">
                {picker.recipes.map((r) => (
                  <button key={r.id} className="ms-recipe" onClick={() => useRecipe(r.id)} disabled={pending}>
                    <span className="rc-e" aria-hidden="true">
                      {r.emoji ?? "🍽"}
                    </span>
                    <span className="rc-main">
                      <b>{r.name}</b>
                      <small>
                        {nf(r.kcal)} kcal · {nf(r.proteinG)} g P
                      </small>
                    </span>
                    <Plus size={16} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {picker?.favorites.length ? (
            <section className="ms-group">
              <span className="eyebrow">⭐ Favoritos</span>
              <div className="ms-hits inline">
                {picker.favorites.map((f) => (
                  <FoodRow key={f.id} food={f} onPick={setPendingFood} onFav={favorite} />
                ))}
              </div>
            </section>
          ) : null}

          {picker?.recent.length ? (
            <section className="ms-group">
              <span className="eyebrow">Recientes</span>
              <div className="ms-hits inline">
                {picker.recent.map((f) => (
                  <FoodRow key={f.id} food={f} onPick={setPendingFood} onFav={favorite} />
                ))}
              </div>
            </section>
          ) : null}

          {picker && !picker.favorites.length && !picker.recent.length && !picker.recipes.length && (
            <p className="note">Buscá un alimento para empezar. Los que uses seguido van a aparecer acá.</p>
          )}
        </>
      )}

      {/* Foto */}
      {photo ? (
        <div className="ms-photo">
          <Image src={photo.preview} alt="Foto de la comida" fill sizes="100vw" className="md-img" />
          <button className="md-fab ms-photo-x" onClick={() => setPhoto(null)} aria-label="Quitar foto">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button className="ms-photo-add" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Camera size={18} />
          <span>{uploading ? "Subiendo…" : "Agregar foto"}</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickPhoto(f);
          e.target.value = "";
        }}
      />

      {error && <p className="form-error">{error}</p>}

      <button className="ci-save" onClick={save} disabled={pending || items.length === 0}>
        {pending ? "Guardando…" : `Registrar${items.length ? ` · ${nf(totals.kcal)} kcal` : ""}`}
      </button>
    </Sheet>
  );
}

/** Fila de alimento: macros a la vista y estrella de favorito. */
function FoodRow({
  food,
  onPick,
  onFav,
}: {
  food: FoodHit;
  onPick: (f: FoodHit) => void;
  onFav: (f: FoodHit, e: React.MouseEvent) => void;
}) {
  return (
    <div className="ms-hit">
      <button className="hit-main" onClick={() => onPick(food)}>
        <span className="hit-id">
          <b>
            {food.name}
            {food.state && <em className="hit-state">{food.state}</em>}
          </b>
          <small>
            {nf(food.kcal)} kcal · {food.base === "100ml" ? "100 ml" : "100 g"}
          </small>
        </span>
        <span className="hit-macros">
          <em>P {nf(food.proteinG, 1)}</em>
          <em>C {nf(food.carbsG, 1)}</em>
          <em>G {nf(food.fatG, 1)}</em>
        </span>
      </button>
      <button
        className={`hit-fav${food.isFavorite ? " on" : ""}`}
        onClick={(e) => onFav(food, e)}
        aria-label={food.isFavorite ? `Quitar ${food.name} de favoritos` : `Marcar ${food.name} como favorito`}
        aria-pressed={food.isFavorite}
      >
        <Star size={16} fill={food.isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

/** Paso de cantidad: se elige en la unidad natural del alimento. */
function QuantityStep({
  food,
  onBack,
  onConfirm,
}: {
  food: FoodHit;
  onBack: () => void;
  onConfirm: (grams: number) => void;
}) {
  const hasUnit = !!food.unitLabel && !!food.unitGrams;
  const [mode, setMode] = useState<"unit" | "gram">(hasUnit ? "unit" : "gram");
  const [units, setUnits] = useState(1);
  const [grams, setGrams] = useState(100);

  const total = mode === "unit" && hasUnit ? units * (food.unitGrams ?? 0) : grams;
  const m = macrosOf(food, total);
  const u = unitOf(food);

  return (
    <div className="qty">
      <header className="qty-head">
        <button className="md-fab qty-back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3>{food.name}</h3>
          <p>
            {nf(food.kcal)} kcal · {food.base === "100ml" ? "100 ml" : "100 g"}
            {food.state ? ` · ${food.state}` : ""}
          </p>
        </div>
      </header>

      {hasUnit && (
        <div className="chip-row">
          <button className={`chip${mode === "unit" ? " on" : ""}`} onClick={() => setMode("unit")}>
            Por {food.unitLabel}
          </button>
          <button className={`chip${mode === "gram" ? " on" : ""}`} onClick={() => setMode("gram")}>
            En {u}
          </button>
        </div>
      )}

      <div className="qty-input">
        {mode === "unit" && hasUnit ? (
          <>
            <button onClick={() => setUnits((v) => Math.max(0.5, Math.round((v - 0.5) * 2) / 2))} aria-label="Menos">
              <Minus size={20} />
            </button>
            <span className="qty-val">
              {nf(units, units % 1 === 0 ? 0 : 1)}
              <small>
                {food.unitLabel}
                {units !== 1 ? "s" : ""}
              </small>
            </span>
            <button onClick={() => setUnits((v) => v + 0.5)} aria-label="Más">
              <Plus size={20} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setGrams((v) => Math.max(5, v - 10))} aria-label="Menos">
              <Minus size={20} />
            </button>
            <input
              className="qty-field"
              type="number"
              inputMode="numeric"
              min={1}
              value={grams}
              onChange={(e) => setGrams(Math.max(1, Number(e.target.value) || 0))}
              aria-label={`Cantidad en ${u}`}
            />
            <button onClick={() => setGrams((v) => v + 10)} aria-label="Más">
              <Plus size={20} />
            </button>
          </>
        )}
      </div>

      <p className="qty-eq">
        = {nf(total)} {u}
      </p>

      <div className="qty-macros">
        <div className="qm kcal">
          <span>🔥 Calorías</span>
          <b>{nf(m.kcal)}</b>
        </div>
        <div className="qm">
          <span>🍗 Proteína</span>
          <b>{nf(m.protein, 1)} g</b>
        </div>
        <div className="qm">
          <span>🌾 Carbos</span>
          <b>{nf(m.carbs, 1)} g</b>
        </div>
        <div className="qm">
          <span>🥑 Grasa</span>
          <b>{nf(m.fat, 1)} g</b>
        </div>
      </div>

      <button className="ci-save" onClick={() => onConfirm(total)}>
        Agregar
      </button>
    </div>
  );
}
