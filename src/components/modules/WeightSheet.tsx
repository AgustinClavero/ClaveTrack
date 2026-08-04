"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";
import { saveWeight } from "@/app/actions";

/** Alta rápida de peso desde el botón "+". */
export function WeightSheet({ current }: { current: number | null }) {
  const open = useUIStore((s) => s.activeSheet === "weight");
  const closeSheet = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKg(current != null ? String(current).replace(".", ",") : "");
    setError(null);
  }, [open, current]);

  function save() {
    const val = parseFloat(kg.replace(",", "."));
    if (isNaN(val)) {
      setError("Ingresá un peso válido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveWeight({ kg: val });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeSheet();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={closeSheet} title="Registrar peso" subtitle="Se guarda en el día de hoy.">
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
      {error && <p className="form-error">{error}</p>}
      <button className="ci-save" onClick={save} disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </Sheet>
  );
}
