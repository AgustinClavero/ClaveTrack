"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { upsertHabit, archiveHabit } from "@/app/actions";
import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";
import type { Habit, HabitCategory } from "@/types";

const KINDS = [
  { k: "boolean", l: "Sí / no", hint: "Se marca hecho o no" },
  { k: "numeric", l: "Cantidad", hint: "Sumás un valor (litros, pasos…)" },
  { k: "duration", l: "Duración", hint: "Minutos u horas" },
] as const;

const CATEGORIES: { k: HabitCategory; l: string; e: string }[] = [
  { k: "nutrition", l: "Nutrición", e: "🍽" },
  { k: "activity", l: "Movimiento", e: "🏃" },
  { k: "routine", l: "Rutina", e: "🗓" },
  { k: "mind", l: "Mente", e: "🧠" },
];

/** Presets de unidad según lo que se mide: menos escritura libre, menos errores. */
const UNIT_PRESETS = ["L", "ml", "pasos", "min", "h", "km", "veces", "x/sem"];

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  kind: "boolean" as (typeof KINDS)[number]["k"],
  targetValue: "",
  unit: "",
  emoji: "",
  isKey: false,
  category: "routine" as HabitCategory,
};

export function HabitsPanel({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function startEdit(h: Habit) {
    setEditing({
      id: h.id,
      name: h.name,
      kind: (h.kind === "weekly" ? "numeric" : h.kind) as (typeof KINDS)[number]["k"],
      targetValue: h.target != null ? String(h.target) : "",
      unit: h.unit,
      emoji: h.emoji === "✓" ? "" : h.emoji,
      isKey: h.isKey,
      category: h.category,
    });
    setMsg(null);
  }

  function save() {
    if (!editing) return;
    setMsg(null);
    startTransition(async () => {
      const res = await upsertHabit({
        id: editing.id,
        name: editing.name,
        kind: editing.kind,
        targetValue: editing.kind === "boolean" ? null : editing.targetValue ? num(editing.targetValue) : null,
        unit: editing.kind === "boolean" ? null : editing.unit || null,
        emoji: editing.emoji || null,
        isKey: editing.isKey,
        category: editing.category,
      });
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setEditing(null);
      setMsg({ ok: true, text: "Hábito guardado." });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await archiveHabit({ habitId: id });
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else router.refresh();
    });
  }

  return (
    <div className="stack">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Tus hábitos</h2>
          <p className="note" style={{ margin: 0 }}>
            {habits.length} activos · agrupados por la página donde se registran
          </p>
        </div>
        <button className="head-action" onClick={() => setEditing({ ...EMPTY })}>
          <Plus size={16} />
          <span>Nuevo</span>
        </button>
      </div>

      {msg && <p className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</p>}

      {editing && (
        <div className="card hedit">
          <h3 className="panel-title">{editing.id ? "Editar hábito" : "Nuevo hábito"}</h3>

          <div className="form-grid">
            <label className="field">
              <span>Nombre</span>
              <input
                className="ci-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ej. Beber agua"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Emoji</span>
              <input
                className="ci-input"
                value={editing.emoji}
                onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                placeholder="💧"
              />
            </label>
          </div>

          <div className="field">
            <span>¿Dónde se registra?</span>
            <div className="cat-picker">
              {CATEGORIES.map((c) => (
                <button
                  key={c.k}
                  className={`cat-opt${editing.category === c.k ? " on" : ""}`}
                  onClick={() => setEditing({ ...editing, category: c.k })}
                >
                  <span aria-hidden="true">{c.e}</span>
                  {c.l}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Cómo lo medís</span>
            <div className="stack-sm">
              {KINDS.map((k) => (
                <button
                  key={k.k}
                  className={`opt-row${editing.kind === k.k ? " on" : ""}`}
                  onClick={() => setEditing({ ...editing, kind: k.k })}
                >
                  <b>{k.l}</b>
                  <small style={{ display: "block", color: "var(--text-2)", marginTop: 2 }}>{k.hint}</small>
                </button>
              ))}
            </div>
          </div>

          {editing.kind !== "boolean" && (
            <>
              <div className="form-grid">
                <label className="field">
                  <span>Objetivo diario</span>
                  <input
                    className="ci-input"
                    inputMode="decimal"
                    value={editing.targetValue}
                    onChange={(e) => setEditing({ ...editing, targetValue: e.target.value })}
                    placeholder="2,5"
                  />
                </label>
                <label className="field">
                  <span>Unidad</span>
                  <input
                    className="ci-input"
                    value={editing.unit}
                    onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                    placeholder="L / pasos / min"
                  />
                </label>
              </div>
              <div className="chip-row">
                {UNIT_PRESETS.map((u) => (
                  <button
                    key={u}
                    className={`chip${editing.unit === u ? " on" : ""}`}
                    onClick={() => setEditing({ ...editing, unit: u })}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="switch-row">
            <input
              type="checkbox"
              checked={editing.isKey}
              onChange={(e) => setEditing({ ...editing, isKey: e.target.checked })}
            />
            <span>
              Destacar en el dashboard <small>(hábito clave)</small>
            </span>
          </label>

          <div className="btn-row">
            <button className="btn-dark" onClick={save} disabled={pending || !editing.name.trim()}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {habits.length === 0 && !editing ? (
        <div className="card empty-card">
          <p>Todavía no tenés hábitos.</p>
          <button className="btn-dark-sm" onClick={() => setEditing({ ...EMPTY })}>
            Crear el primero
          </button>
        </div>
      ) : (
        CATEGORIES.map((c) => {
          const items = habits.filter((h) => h.category === c.k);
          if (items.length === 0) return null;
          return (
            <div key={c.k}>
              <div className="sec-head">
                <span className="eyebrow">
                  {c.e} {c.l}
                </span>
                <span className="dc-pct">{items.length}</span>
              </div>
              <div className="hset-grid">
                {items.map((h) => (
                  <article className="card hset-card" key={h.id}>
                    <div className="hsc-top">
                      <Ring size={48} stroke={6} value={1} color="var(--surface-2)" track="var(--surface-2)" centerFontSize={20}>
                        {h.emoji}
                      </Ring>
                      <div className="hsc-id">
                        <h4>
                          {h.name}
                          {h.isKey && <Star size={13} className="hs-star" aria-label="Hábito clave" />}
                        </h4>
                        <p>
                          {h.target != null
                            ? `Objetivo: ${nf(h.target, ["l", "h"].includes(h.unit.toLowerCase()) ? 1 : 0)} ${h.unit}`
                            : "Se marca a diario"}
                        </p>
                      </div>
                    </div>
                    <div className="hsc-actions">
                      <button className="head-action" onClick={() => startEdit(h)}>
                        <Pencil size={14} />
                        <span>Editar</span>
                      </button>
                      <button className="mr-del" onClick={() => remove(h.id)} aria-label={`Archivar ${h.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
