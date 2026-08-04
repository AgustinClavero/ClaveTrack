"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { logWorkout } from "@/app/actions";
import {
  INTENSITY_LABELS,
  WORKOUTS,
  burnedKcal,
  stepsToKm,
  stepsToMinutes,
  workoutDef,
  type Intensity,
  type WorkoutKind,
} from "@/lib/calculations/activity";
import { nf } from "@/lib/utils";

/**
 * Alta de sesión de actividad. Las calorías se previsualizan en vivo con
 * la misma fórmula MET que usa el servidor al guardar.
 */
export function WorkoutSheet({ weightKg, heightCm }: { weightKg: number; heightCm: number | null }) {
  const open = useUIStore((s) => s.activeSheet === "workout");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [kind, setKind] = useState<WorkoutKind>("caminata");
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>("moderada");
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const def = workoutDef(kind);

  useEffect(() => {
    if (!open) return;
    setKind("caminata");
    setMinutes(30);
    setIntensity("moderada");
    setSteps(0);
    setDistance("");
    setError(null);
  }, [open]);

  // Si se cargan pasos, los minutos se estiman solos (cadencia ~100 pasos/min).
  useEffect(() => {
    if (kind === "caminata" && steps > 0) setMinutes(Math.max(1, Math.round(stepsToMinutes(steps))));
  }, [steps, kind]);

  const kcal = useMemo(
    () => burnedKcal({ kind, minutes, intensity, weightKg }),
    [kind, minutes, intensity, weightKg]
  );
  const km = steps > 0 ? stepsToKm(steps, heightCm) : Number(distance.replace(",", ".")) || 0;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await logWorkout({
        kind,
        minutes,
        intensity,
        steps: def.tracksSteps && steps > 0 ? steps : null,
        distanceKm: distance ? Number(distance.replace(",", ".")) : null,
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
    <Sheet open={open} onClose={closeSheet} title="Registrar actividad" className="workout-sheet">
      <div className="wk-grid" role="group" aria-label="Tipo de actividad">
        {WORKOUTS.map((w) => (
          <button
            key={w.kind}
            className={`wk-opt${kind === w.kind ? " on" : ""}`}
            onClick={() => setKind(w.kind)}
            aria-pressed={kind === w.kind}
          >
            <span aria-hidden="true">{w.emoji}</span>
            {w.label}
          </button>
        ))}
      </div>

      <div className="chip-row" role="group" aria-label="Intensidad">
        {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((i) => (
          <button key={i} className={`chip${intensity === i ? " on" : ""}`} onClick={() => setIntensity(i)}>
            {INTENSITY_LABELS[i]}
          </button>
        ))}
      </div>

      <div className="ci-field">
        <div className="lab">
          <span>Duración</span>
          <span className="val">{minutes} min</span>
        </div>
        <div className="stepper-mini wide">
          <button onClick={() => setMinutes((m) => Math.max(1, m - 5))} aria-label="Menos minutos">
            <Minus size={16} />
          </button>
          <span>{minutes} min</span>
          <button onClick={() => setMinutes((m) => Math.min(600, m + 5))} aria-label="Más minutos">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {def.tracksSteps && (
        <div className="ci-field">
          <div className="lab">
            <span>Pasos</span>
            {km > 0 && <span className="val">{nf(km, 2)} km</span>}
          </div>
          <input
            className="ci-input"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Ej. 8000"
            value={steps || ""}
            onChange={(e) => setSteps(Number(e.target.value) || 0)}
          />
        </div>
      )}

      {def.tracksDistance && !def.tracksSteps && (
        <div className="ci-field">
          <div className="lab">
            <span>Distancia (km)</span>
          </div>
          <input
            className="ci-input"
            inputMode="decimal"
            placeholder="Ej. 5,2"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>
      )}

      <div className="wk-burn">
        <span className="wk-fire" aria-hidden="true">
          🔥
        </span>
        <div>
          <span className="eyebrow">Calorías estimadas</span>
          <b>{weightKg ? nf(kcal) : "—"}</b>
        </div>
        <small>
          {weightKg
            ? `${def.label} ${INTENSITY_LABELS[intensity].toLowerCase()} · ${minutes} min · ${nf(weightKg, 1)} kg`
            : "Registrá tu peso para estimar las calorías"}
        </small>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="ci-save" onClick={save} disabled={pending}>
        {pending ? "Guardando…" : "Registrar sesión"}
      </button>
    </Sheet>
  );
}
