"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserSettings } from "@/app/actions";
import { AREA_LABELS, DEFAULT_WEIGHTS, type AreaKey } from "@/lib/calculations/scoring";
import type { SettingsData } from "@/lib/data/queries";

const ORDER: AreaKey[] = ["nutrition", "habits", "rest", "activity", "focus", "study"];

export function ScorePanel({ settings }: { settings: SettingsData["settings"] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [threshold, setThreshold] = useState(settings?.streak_threshold ?? 75);
  const [w, setW] = useState<Record<AreaKey, number>>({
    nutrition: settings?.w_nutrition ?? DEFAULT_WEIGHTS.nutrition,
    focus: settings?.w_tasks ?? DEFAULT_WEIGHTS.focus,
    activity: settings?.w_activity ?? DEFAULT_WEIGHTS.activity,
    study: settings?.w_study ?? DEFAULT_WEIGHTS.study,
    habits: settings?.w_habits ?? DEFAULT_WEIGHTS.habits,
    rest: settings?.w_sleep ?? DEFAULT_WEIGHTS.rest,
  });

  const total = ORDER.reduce((s, k) => s + w[k], 0);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateUserSettings({ streakThreshold: threshold, weights: w });
      setMsg(res.ok ? { ok: true, text: "Preferencias guardadas." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="stack">
      <div className="card">
        <h2 className="panel-title">Umbral de la racha</h2>
        <p className="note">Un día cuenta para la racha si tu cumplimiento llega a este porcentaje.</p>
        <div className="ci-field">
          <div className="lab">
            <span>Mínimo para cumplir el día</span>
            <span className="val">{threshold}%</span>
          </div>
          <input type="range" min={50} max={100} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </div>
      </div>

      <div className="card">
        <h2 className="panel-title">Peso de cada área</h2>
        <p className="note">
          Cuánto influye cada área en tu cumplimiento diario. Las áreas sin datos no te penalizan: su peso se reparte
          entre las que sí usás.
        </p>

        {ORDER.map((k) => (
          <div className="ci-field" key={k}>
            <div className="lab">
              <span>{AREA_LABELS[k]}</span>
              <span className="val">{total ? Math.round((w[k] / total) * 100) : 0}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={w[k]}
              onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
            />
          </div>
        ))}

        {msg && <p className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</p>}
        <button className="btn-dark" onClick={save} disabled={pending || total === 0}>
          {pending ? "Guardando…" : "Guardar cumplimiento"}
        </button>
      </div>
    </div>
  );
}
