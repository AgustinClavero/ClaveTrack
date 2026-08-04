"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions";
import { workoutDef, INTENSITY_LABELS, type WorkoutKind, type Intensity } from "@/lib/calculations/activity";
import { nf } from "@/lib/utils";
import type { WorkoutRow as Row } from "@/lib/data/queries";

export function WorkoutRow({ workout, isToday }: { workout: Row; isToday: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const def = workoutDef(workout.kind as WorkoutKind);

  function remove() {
    startTransition(async () => {
      await deleteWorkout({ workoutId: workout.id });
      setConfirm(false);
      router.refresh();
    });
  }

  const detail = [
    `${workout.minutes} min`,
    INTENSITY_LABELS[workout.intensity as Intensity],
    workout.distanceKm ? `${nf(workout.distanceKm, 2)} km` : null,
    workout.steps ? `${nf(workout.steps)} pasos` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="wk-row">
      <span className="wk-emoji" aria-hidden="true">
        {def.emoji}
      </span>
      <div className="wk-main">
        <div className="wk-top">
          <span className="name">{def.label}</span>
          {!isToday && <span className="time">{formatDay(workout.date)}</span>}
        </div>
        <div className="wk-detail">{detail}</div>
      </div>
      <div className="wk-kcal">
        <b>{nf(workout.kcal)}</b>
        <small>kcal</small>
      </div>
      {confirm ? (
        <div className="mr-confirm">
          <button className="linkish" onClick={remove} disabled={pending}>
            {pending ? "…" : "Borrar"}
          </button>
          <button className="linkish muted" onClick={() => setConfirm(false)}>
            No
          </button>
        </div>
      ) : (
        <button className="mr-del" onClick={() => setConfirm(true)} aria-label={`Borrar ${def.label}`}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function formatDay(iso: string) {
  const d = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(iso + "T12:00:00Z")
  );
  return d.charAt(0).toUpperCase() + d.slice(1);
}
