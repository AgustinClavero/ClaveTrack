"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Camera, Minus, Plus, Trash2 } from "lucide-react";
import { updateMeal, deleteMeal, deleteMealItem } from "@/app/actions";
import { uploadMealPhoto } from "@/lib/upload";
import { nf } from "@/lib/utils";
import type { MealDetail } from "@/lib/data/queries";

const BASE_UNIT: Record<string, string> = { "100g": "g", "100ml": "ml", unidad: "un" };

/**
 * Detalle de comida: foto a sangre como banner y la ficha montada encima.
 * Sin foto, el banner es un bloque neutro con el emoji de la comida.
 */
export function MealDetailView({ meal }: { meal: MealDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [servings, setServings] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = meal.totals;
  const scaled = (n: number) => n * servings;

  async function onPickPhoto(file: File) {
    setError(null);
    setUploading(true);
    const res = await uploadMealPhoto(file);
    setUploading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    startTransition(async () => {
      const up = await updateMeal({ mealId: meal.id, photoPath: res.path });
      if (!up.ok) setError(up.error);
      else router.refresh();
    });
  }

  function applyServings() {
    if (servings === 1) return;
    startTransition(async () => {
      const res = await updateMeal({ mealId: meal.id, servings });
      if (!res.ok) setError(res.error);
      else {
        setServings(1);
        router.refresh();
      }
    });
  }

  function removeItem(id: string) {
    startTransition(async () => {
      const res = await deleteMealItem({ itemId: id });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function removeMeal() {
    startTransition(async () => {
      const res = await deleteMeal({ mealId: meal.id });
      if (!res.ok) setError(res.error);
      else router.push("/nutrition");
    });
  }

  return (
    <article className="meal-detail">
      <div className={`md-banner${meal.photoUrl ? "" : " empty"}`}>
        {meal.photoUrl ? (
          <Image src={meal.photoUrl} alt={meal.label} fill sizes="100vw" className="md-img" priority />
        ) : (
          <span className="md-ph" aria-hidden="true">
            {meal.emoji}
          </span>
        )}

        <div className="md-bar">
          <button className="md-fab" onClick={() => router.push("/nutrition")} aria-label="Volver">
            <ArrowLeft size={19} />
          </button>
          <span className="md-bar-t">Nutrición</span>
          <button
            className="md-fab"
            onClick={() => fileRef.current?.click()}
            aria-label={meal.photoUrl ? "Cambiar foto" : "Agregar foto"}
            disabled={uploading || pending}
          >
            <Camera size={18} />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          // Sin `capture`: con él el móvil abre la cámara y no deja elegir
          // de la galería.
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickPhoto(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="md-sheet">
        <div className="md-head">
          <div>
            <span className="md-time">{meal.time ?? "hoy"}</span>
            <h1 className="md-title">{meal.label}</h1>
          </div>
          <div className="stepper-mini md-serv">
            <button onClick={() => setServings((s) => Math.max(0.25, Math.round((s - 0.25) * 100) / 100))} aria-label="Menos porción">
              <Minus size={15} />
            </button>
            <span>{nf(servings, servings % 1 === 0 ? 0 : 2)}</span>
            <button onClick={() => setServings((s) => Math.min(10, s + 0.25))} aria-label="Más porción">
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="md-kcal">
          <span className="md-kicon" aria-hidden="true">
            🔥
          </span>
          <div>
            <span className="eyebrow">Calorías</span>
            <b>{nf(scaled(t.kcal))}</b>
          </div>
        </div>

        <div className="md-macros">
          {[
            { l: "Proteína", v: scaled(t.protein), e: "🍗", c: "var(--red)" },
            { l: "Carbos", v: scaled(t.carbs), e: "🍝", c: "var(--amber)" },
            { l: "Grasas", v: scaled(t.fat), e: "🥑", c: "var(--blue)" },
          ].map((m) => (
            <div className="md-mcard" key={m.l}>
              <span className="md-mtop">
                <i aria-hidden="true">{m.e}</i>
                {m.l}
              </span>
              <b style={{ color: m.c }}>{nf(m.v, 1)} g</b>
            </div>
          ))}
        </div>

        {servings !== 1 && (
          <button className="btn-dark" onClick={applyServings} disabled={pending}>
            {pending ? "Aplicando…" : `Guardar como ${nf(servings, 2)} porciones`}
          </button>
        )}

        <div className="sec-head">
          <span className="eyebrow">Ingredientes</span>
          <span className="md-count">{meal.items.length}</span>
        </div>

        <div className="md-items">
          {meal.items.map((i) => (
            <div className="md-item" key={i.id}>
              <div className="md-in">
                <span className="n">{i.name}</span>
                <span className="s">
                  {nf(scaled(i.kcal))} kcal · {nf(i.quantity * servings, i.base === "unidad" ? 2 : 0)}{" "}
                  {BASE_UNIT[i.base] ?? ""}
                </span>
              </div>
              <button className="mr-del" onClick={() => removeItem(i.id)} aria-label={`Quitar ${i.name}`} disabled={pending}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        {uploading && <p className="note">Subiendo foto…</p>}

        <div className="md-actions">
          <button className="btn-ghost" onClick={removeMeal} disabled={pending}>
            Borrar comida
          </button>
          <button className="btn-dark" onClick={() => router.push("/nutrition")}>
            Listo
          </button>
        </div>
      </div>
    </article>
  );
}
