"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store";
import { saveCheckin } from "@/app/actions";
import { useActiveDay } from "@/lib/hooks/use-active-day";
import { Sheet } from "./Sheet";
import { wellbeing, dayAdvice } from "@/lib/calculations/wellbeing";
import { nf } from "@/lib/utils";
import type { Checkin } from "@/lib/data/queries";

const SLIDERS = [
  { key: "mood", label: "Ánimo", emoji: "😊" },
  { key: "energy", label: "Energía", emoji: "⚡" },
  { key: "sleepQuality", label: "Calidad de sueño", emoji: "😴" },
  { key: "hunger", label: "Hambre", emoji: "🍔" },
  { key: "stress", label: "Estrés", emoji: "😰" },
] as const;

/** Check-in del día. Precarga lo ya guardado: reabrirlo no pisa datos. */
export function CheckinSheet({ checkin }: { checkin: Checkin | null }) {
  const open = useUIStore((s) => s.activeSheet === "checkin");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const date = useActiveDay();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [weight, setWeight] = useState("");
  const [focus, setFocus] = useState("");
  const [sleepH, setSleepH] = useState("");
  const [vals, setVals] = useState<Record<string, number>>({ mood: 7, energy: 6, sleepQuality: 8, hunger: 4, stress: 4 });

  // Se recalcula mientras se mueven los deslizadores: el usuario ve el efecto.
  const wb = wellbeing({
    mood: vals.mood,
    energy: vals.energy,
    sleepQuality: vals.sleepQuality,
    hunger: vals.hunger,
    stress: vals.stress,
    sleepHours: sleepH ? Number(sleepH.replace(",", ".")) : null,
  });

  // Al abrir, sincroniza con lo que ya hay guardado del día.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setWeight(checkin?.weightKg != null ? String(checkin.weightKg).replace(".", ",") : "");
    setFocus(checkin?.focusNote ?? "");
    setSleepH(checkin?.sleepHours != null ? String(checkin.sleepHours).replace(".", ",") : "");
    setVals({
      mood: checkin?.mood ?? 7,
      energy: checkin?.energy ?? 6,
      sleepQuality: checkin?.sleepQuality ?? 8,
      hunger: checkin?.hunger ?? 4,
      stress: checkin?.stress ?? 4,
    });
  }, [open, checkin]);

  function save() {
    const w = parseFloat(weight.replace(",", "."));
    setError(null);
    startTransition(async () => {
      const res = await saveCheckin({
        date,
        weightKg: isNaN(w) ? null : w,
        mood: vals.mood,
        energy: vals.energy,
        sleepQuality: vals.sleepQuality,
        hunger: vals.hunger,
        stress: vals.stress,
        sleepHours: sleepH ? Number(sleepH.replace(",", ".")) : null,
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

  const advice = dayAdvice(wb);

  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title={checkin?.done ? "Tu check-in de hoy" : "Check-in de hoy"}
      subtitle="Menos de un minuto. Con esto armamos tus estadísticas."
      className="checkin"
    >
      {/* Derivado, no se carga: es la lectura de cómo llegás al día. */}
      <div className={`ci-state ${wb.level}`}>
        <div className="cis-top">
          <span className="cis-dot" aria-hidden="true" />
          <span className="cis-lab">Estado del día: {wb.label}</span>
          <span className="cis-idx">{wb.index}</span>
        </div>
        <div className="cis-parts">
          {wb.parts.map((p) => (
            <span key={p.key}>
              {p.emoji} {p.key === "sleepHours" ? `${nf(p.raw, 1)} h` : p.raw}
            </span>
          ))}
        </div>
        {advice && <p className="cis-advice">{advice}</p>}
      </div>

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

      <div className="ci-field">
        <div className="lab">
          <span>Horas dormidas</span>
        </div>
        <input
          className="ci-input"
          type="text"
          inputMode="decimal"
          placeholder="Ej. 7,5"
          value={sleepH}
          onChange={(e) => setSleepH(e.target.value)}
        />
      </div>

      {SLIDERS.map((s) => (
        <div className="ci-field" key={s.key}>
          <div className="lab">
            <span>
              {s.emoji} {s.label}
            </span>
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
