"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { upsertHabit, archiveHabit, seedDefaultFoods } from "@/app/actions";
import type { Habit } from "@/types";

const SUGGESTIONS = ["Creatina", "Vitamina D", "Omega 3", "Magnesio", "Multivitamínico", "Proteína", "Zinc", "Colágeno"];

/** Gestión de los suplementos que se toman a diario. Cada uno es un hábito marcable. */
export function SupplementsPanel({ items }: { items: Habit[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function add(value: string) {
    const clean = value.trim();
    if (!clean) return;
    if (items.some((i) => i.name.toLowerCase() === clean.toLowerCase())) {
      setMsg({ ok: false, text: "Ese suplemento ya está en tu lista." });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await upsertHabit({
        name: clean,
        kind: "boolean",
        emoji: "💊",
        category: "nutrition",
        groupKey: "supplements",
        isKey: false,
      });
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setName("");
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

  const free = SUGGESTIONS.filter((s) => !items.some((i) => i.name.toLowerCase() === s.toLowerCase()));

  function loadCatalog() {
    setMsg(null);
    startTransition(async () => {
      const res = await seedDefaultFoods();
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else
        setMsg({
          ok: true,
          text: res.data.inserted ? `Se agregaron ${res.data.inserted} alimentos.` : "Tu catálogo ya está completo.",
        });
    });
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Suplementos diarios</h2>
            <p className="note" style={{ margin: 0 }}>
              Los marcás cada día desde Nutrición. Cuentan para tu cumplimiento.
            </p>
          </div>
          <span className="sup-emoji" aria-hidden="true">
            💊
          </span>
        </div>

        <div className="supps-add">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add(name)}
            placeholder="Ej. Creatina"
            aria-label="Nombre del suplemento"
          />
          <button className="add" onClick={() => add(name)} disabled={pending || !name.trim()}>
            Agregar
          </button>
        </div>

        {free.length > 0 && (
          <>
            <p className="note">Sugerencias rápidas:</p>
            <div className="chip-row">
              {free.slice(0, 6).map((s) => (
                <button key={s} className="chip" onClick={() => add(s)} disabled={pending}>
                  + {s}
                </button>
              ))}
            </div>
          </>
        )}

        {msg && <p className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</p>}

        {items.length === 0 ? (
          <p className="note">Todavía no cargaste ninguno.</p>
        ) : (
          <div className="stack-sm" style={{ marginTop: 12 }}>
            {items.map((s) => (
              <div className="hset-row" key={s.id}>
                <span className="hs-emoji">💊</span>
                <span className="hs-main">
                  <span className="n">{s.name}</span>
                  <span className="s">Se marca a diario</span>
                </span>
                <button className="mr-del" onClick={() => remove(s.id)} aria-label={`Quitar ${s.name}`} disabled={pending}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="panel-title">Catálogo de alimentos</h2>
        <p className="note" style={{ margin: "0 0 12px" }}>
          Sumá los alimentos base por categoría (proteínas, carbos, verduras, frutas, grasas, lácteos y condimentos).
          No duplica los que ya tenés.
        </p>
        <button className="btn-dark-sm" onClick={loadCatalog} disabled={pending}>
          {pending ? "Cargando…" : "Actualizar catálogo base"}
        </button>
      </div>
    </div>
  );
}
