"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store";
import { saveCheckin } from "@/app/actions";
import { Sheet } from "./Sheet";
import type { Checkin } from "@/lib/data/queries";

const SLIDERS = [
  { key: "mood", label: "Ánimo" },
  { key: "energy", label: "Energía" },
  { key: "sleepQuality", label: "Calidad de sueño" },
  { key: "hunger", label: "Hambre" },
] as const;

/** Check-in del día. Precarga lo ya guardado: reabrirlo no pisa datos. */
export function CheckinSheet({ checkin }: { checkin: Checkin | null }) {
  const open = useUIStore((s) => s.activeSheet === "checkin");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [weight, setWeight] = useState("");
  const [focus, setFocus] = useState("");
  const [vals, setVals] = useState<Record<string, number>>({ mood: 7, energy: 6, sleepQuality: 8, hunger: 4 });

  // Al abrir, sincroniza con lo que ya hay guardado del día.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setWeight(checkin?.weightKg != null ? String(checkin.weightKg).replace(".", ",") : "");
    setFocus(checkin?.focusNote ?? "");
    setVals({
      mood: checkin?.mood ?? 7,
      energy: checkin?.energy ?? 6,
      sleepQuality: checkin?.sleepQuality ?? 8,
      hunger: checkin?.hunger ?? 4,
    });
  }, [open, checkin]);

  function save() {
    const w = parseFloat(weight.replace(",", "."));
    setError(null);
    startTransition(async () => {
      const res = await saveCheckin({
        weightKg: isNaN(w) ? null : w,
        mood: vals.mood,
        energy: vals.energy,
        sleepQuality: vals.sleepQuality,
        hunger: vals.hunger,
        focusNote: focus || undefined,
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
    <Sheet
      open={open}
      onClose={closeSheet}
      title={checkin?.done ? "Tu check-in de hoy" : "Check-in de hoy"}
      subtitle="Menos de un minuto. Con esto armamos tus estadísticas."
      className="checkin"
    >
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

      {error && <p className="form-error">{error}</p>}

      <button className="ci-save" onClick={save} disabled={pending}>
        {pending ? "Guardando…" : checkin?.done ? "Actualizar" : "Empezar el día →"}
      </button>
    </Sheet>
  );
}
