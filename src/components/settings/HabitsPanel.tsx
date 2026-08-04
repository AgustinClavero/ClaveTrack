"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { upsertHabit, archiveHabit } from "@/app/actions";
import { nf } from "@/lib/utils";
import type { Habit } from "@/types";

const KINDS = [
  { k: "boolean", l: "Sí / no" },
  { k: "numeric", l: "Cantidad" },
  { k: "duration", l: "Duración" },
] as const;

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

const EMPTY = { id: undefined as string | undefined, name: "", kind: "boolean", targetValue: "", unit: "", emoji: "", isKey: false };

export function HabitsPanel({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function startEdit(h: Habit) {
    setEditing({
      id: h.id,
      name: h.name,
      kind: h.kind,
      targetValue: h.target != null ? String(h.target) : "",
      unit: h.unit,
      emoji: h.emoji === "✓" ? "" : h.emoji,
      isKey: h.isKey,
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
      <div className="card">
        <div className="panel-head">
          <h2 className="panel-title">Tus hábitos</h2>
          <button className="head-action" onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={16} />
            <span>Nuevo</span>
          </button>
        </div>

        {habits.length === 0 ? (
          <p className="note">Todavía no tenés hábitos. Creá el primero con &quot;Nuevo&quot;.</p>
        ) : (
          <div className="stack-sm">
            {habits.map((h) => (
              <div key={h.id} className="hset-row">
                <span className="hs-emoji">{h.emoji}</span>
                <button className="hs-main" onClick={() => startEdit(h)}>
                  <span className="n">{h.name}</span>
                  <span className="s">
                    {h.target != null ? `objetivo ${nf(h.target, h.unit === "L" ? 1 : 0)} ${h.unit}` : "diario"}
                    {h.isKey && " · clave"}
                  </span>
                </button>
                {h.isKey && <Star size={15} className="hs-star" aria-label="Hábito clave" />}
                <button className="mr-del" onClick={() => remove(h.id)} aria-label={`Archivar ${h.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {msg && <p className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</p>}
      </div>

      {editing && (
        <div className="card">
          <h2 className="panel-title">{editing.id ? "Editar hábito" : "Nuevo hábito"}</h2>

          <div className="form-grid">
            <label className="field">
              <span>Nombre</span>
              <input
                className="ci-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ej. Beber agua"
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
            <span>Tipo</span>
            <div className="chip-row">
              {KINDS.map((k) => (
                <button
                  key={k.k}
                  className={`chip${editing.kind === k.k ? " on" : ""}`}
                  onClick={() => setEditing({ ...editing, kind: k.k })}
                >
                  {k.l}
                </button>
              ))}
            </div>
          </div>

          {editing.kind !== "boolean" && (
            <div className="form-grid">
              <label className="field">
                <span>Objetivo diario</span>
                <input
                  className="ci-input"
                  inputMode="decimal"
                  value={editing.targetValue}
                  onChange={(e) => setEditing({ ...editing, targetValue: e.target.value })}
                  placeholder="2.5"
                />
              </label>
              <label className="field">
                <span>Unidad</span>
                <input
                  className="ci-input"
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  placeholder="L / pasos / min / h"
                />
              </label>
            </div>
          )}

          <label className="switch-row">
            <input
              type="checkbox"
              checked={editing.isKey}
              onChange={(e) => setEditing({ ...editing, isKey: e.target.checked })}
            />
            <span>
              Mostrar en el dashboard <small>(hábito clave)</small>
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
    </div>
  );
}
