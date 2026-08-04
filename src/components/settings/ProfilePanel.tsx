"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions";
import { ACTIVITY_LABELS, type ActivityLevel } from "@/lib/calculations/tdee";
import type { SettingsData } from "@/lib/data/queries";

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "America/Bogota",
  "Europe/Madrid",
];

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

/** Edad cumplida a partir de una fecha ISO. */
function ageFrom(iso: string): number {
  const b = new Date(iso + "T00:00:00");
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return Math.max(0, a);
}

export function ProfilePanel({ profile }: { profile: SettingsData["profile"] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [f, setF] = useState({
    displayName: profile?.display_name ?? "",
    timezone: profile?.timezone ?? TIMEZONES[0],
    sex: (profile?.sex as "male" | "female" | null) ?? null,
    birthDate: profile?.birth_date ?? (profile?.birth_year ? `${profile.birth_year}-01-01` : ""),
    heightCm: profile?.height_cm ? String(profile.height_cm) : "",
    activityLevel: (profile?.activity_level as ActivityLevel | null) ?? null,
    targetWeightKg: profile?.target_weight_kg ? String(profile.target_weight_kg) : "",
  });

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateProfile({
        displayName: f.displayName,
        timezone: f.timezone,
        sex: f.sex,
        birthDate: f.birthDate || null,
        heightCm: f.heightCm ? num(f.heightCm) : null,
        activityLevel: f.activityLevel,
        targetWeightKg: f.targetWeightKg ? num(f.targetWeightKg) : null,
      });
      setMsg(res.ok ? { ok: true, text: "Perfil guardado." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="card">
      <h2 className="panel-title">Tus datos</h2>
      <p className="note">Sirven para calcular tus macros y para que el &quot;día&quot; se cierre en tu horario.</p>

      <div className="form-grid">
        <label className="field">
          <span>Nombre</span>
          <input className="ci-input" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
        </label>
        <label className="field">
          <span>Fecha de nacimiento</span>
          <input
            className="ci-input"
            type="date"
            value={f.birthDate}
            max={`${new Date().getFullYear() - 10}-12-31`}
            min={`${new Date().getFullYear() - 100}-01-01`}
            onChange={(e) => setF({ ...f, birthDate: e.target.value })}
          />
          {f.birthDate && <small className="per-kg">{ageFrom(f.birthDate)} años</small>}
        </label>
        <label className="field">
          <span>Altura (cm)</span>
          <input className="ci-input" inputMode="decimal" value={f.heightCm} onChange={(e) => setF({ ...f, heightCm: e.target.value })} />
        </label>
        <label className="field">
          <span>Peso objetivo (kg)</span>
          <input
            className="ci-input"
            inputMode="decimal"
            value={f.targetWeightKg}
            onChange={(e) => setF({ ...f, targetWeightKg: e.target.value })}
          />
        </label>
      </div>

      <div className="field">
        <span>Sexo biológico</span>
        <div className="chip-row">
          {(
            [
              ["male", "Masculino"],
              ["female", "Femenino"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={`chip${f.sex === k ? " on" : ""}`} onClick={() => setF({ ...f, sex: k })}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Nivel de actividad</span>
        <div className="stack-sm">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
            <button
              key={k}
              className={`opt-row${f.activityLevel === k ? " on" : ""}`}
              onClick={() => setF({ ...f, activityLevel: k })}
            >
              {ACTIVITY_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Zona horaria</span>
        <select className="ci-input" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
          {TIMEZONES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      {msg && <p className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</p>}
      <button className="btn-dark" onClick={save} disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </div>
  );
}
