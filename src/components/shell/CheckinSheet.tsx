"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store";
import { saveCheckin } from "@/app/actions";

function localToday() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

const SLIDERS = [
  { key: "mood", label: "Ánimo", def: 7 },
  { key: "energy", label: "Energía", def: 6 },
  { key: "sleepQuality", label: "Calidad de sueño", def: 8 },
  { key: "hunger", label: "Hambre", def: 4 },
] as const;

export function CheckinSheet() {
  const { checkinOpen, closeCheckin } = useUIStore();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weight, setWeight] = useState("");
  const [focus, setFocus] = useState("");
  const [vals, setVals] = useState<Record<string, number>>({ mood: 7, energy: 6, sleepQuality: 8, hunger: 4 });

  function save() {
    const w = parseFloat(weight.replace(",", "."));
    startTransition(async () => {
      await saveCheckin({
        date: localToday(),
        weightKg: isNaN(w) ? null : w,
        mood: vals.mood,
        energy: vals.energy,
        sleepQuality: vals.sleepQuality,
        hunger: vals.hunger,
        focusNote: focus || undefined,
      });
      closeCheckin();
      router.refresh();
    });
  }

  return (
    <>
      <div className={`overlay${checkinOpen ? " show" : ""}`} onClick={closeCheckin} />
      <div className={`sheet checkin${checkinOpen ? " show" : ""}`} role="dialog" aria-label="Check-in">
        <div className="grip" />
        <h3>Check‑in de hoy</h3>
        <div className="sub">Menos de un minuto. Con esto armamos tus estadísticas.</div>

        <div className="ci-field">
          <div className="lab">
            <span>Peso de hoy</span>
          </div>
          <input
            className="ci-input"
            type="text"
            inputMode="decimal"
            placeholder="Ej. 94,3 kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        {SLIDERS.map((s) => (
          <div className="ci-field" key={s.key}>
            <div className="lab">
              <span>{s.label}</span>
              <span className="val">{vals[s.key]}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={vals[s.key]}
              onChange={(e) => setVals((v) => ({ ...v, [s.key]: Number(e.target.value) }))}
            />
          </div>
        ))}

        <div className="ci-field">
          <div className="lab">
            <span>¿Cuál es tu foco de hoy?</span>
          </div>
          <input
            className="ci-input"
            type="text"
            placeholder="Ej. Terminar el módulo de scoring"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>

        <button className="ci-save" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Empezar el día →"}
        </button>
      </div>
    </>
  );
}
