"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { saveWeight } from "@/app/actions";
import { useActiveDay } from "@/lib/hooks/use-active-day";

/**
 * Alta rápida de peso desde el botón "+".
 * Lleva su propio selector de día porque se abre desde cualquier pantalla,
 * incluidas las que no navegan por fecha: sin eso, una pesada que te
 * olvidaste de cargar terminaba siempre en hoy.
 */
export function WeightSheet({ current, today }: { current: number | null; today: string }) {
  const open = useUIStore((s) => s.activeSheet === "weight");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const activeDay = useActiveDay();
  const [pending, startTransition] = useTransition();
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKg(current != null ? String(current).replace(".", ",") : "");
    // Si venís navegando un día pasado, ese es el que se propone.
    setDate(activeDay ?? today);
    setError(null);
  }, [open, current, activeDay, today]);

  function save() {
    const val = parseFloat(kg.replace(",", "."));
    if (isNaN(val)) {
      setError("Ingresá un peso válido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveWeight({ kg: val, date });
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
      title="Registrar peso"
      subtitle={date === today ? "Se guarda en el día de hoy." : "Se guarda en el día que elijas."}
    >
      <div className="ci-field">
        <div className="lab">
          <span>Peso (kg)</span>
        </div>
        <input
          className="ci-input"
          type="text"
          inputMode="decimal"
          placeholder="Ej. 94,3"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
        />
      </div>

      <div className="ci-field">
        <div className="lab">
          <span>Día</span>
        </div>
        <input className="ci-input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="ci-save" onClick={save} disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </Sheet>
  );
}
