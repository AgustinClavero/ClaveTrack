"use client";

import { useState, useTransition } from "react";
import { saveWeight } from "@/app/actions";

export function RegisterWeight({ date, current }: { date: string; current: number }) {
  const [open, setOpen] = useState(false);
  const [kg, setKg] = useState(current ? String(current) : "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    const val = parseFloat(kg.replace(",", "."));
    if (!val || val <= 0) return;
    startTransition(async () => {
      await saveWeight(val, date);
      setSaved(true);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button className="btn-dark-sm" onClick={() => setOpen(true)}>
        {saved ? "Peso registrado ✓" : "Registrar peso →"}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        placeholder="kg (ej. 94,3)"
        autoFocus
        style={{
          flex: 1,
          border: "1.5px solid var(--line)",
          background: "var(--surface)",
          color: "var(--text)",
          borderRadius: 14,
          padding: "12px 14px",
          fontSize: 15,
          outline: "none",
        }}
      />
      <button className="btn-dark-sm" style={{ width: "auto", padding: "0 18px", marginTop: 0 }} onClick={save} disabled={pending}>
        {pending ? "…" : "Guardar"}
      </button>
    </div>
  );
}
