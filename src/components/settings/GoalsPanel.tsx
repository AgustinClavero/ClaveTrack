"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { setNutritionGoals } from "@/app/actions";
import { computeMacroPlan, PRESET_META, ACTIVITY_LABELS, type GoalPreset, type ActivityLevel } from "@/lib/calculations/tdee";
import { nf } from "@/lib/utils";
import type { SettingsData } from "@/lib/data/queries";

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

export function GoalsPanel({
  goals,
  profile,
  lastWeightKg,
}: {
  goals: SettingsData["goals"];
  profile: SettingsData["profile"];
  lastWeightKg: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mode, setMode] = useState<"auto" | "manual" | "imported">(
    (goals?.mode as "auto" | "manual" | "imported") ?? "manual"
  );
  const [preset, setPreset] = useState<GoalPreset>("moderate_cut");

  const [f, setF] = useState({
    kcal: String(goals?.kcal ?? 2000),
    proteinG: String(goals?.protein ?? 140),
    carbsG: String(goals?.carbs ?? 200),
    fatG: String(goals?.fat ?? 65),
    waterMl: String(goals?.waterMl ?? 2500),
  });

  const year = new Date().getFullYear();
  const birth = profile?.birth_date ?? (profile?.birth_year ? `${profile.birth_year}-01-01` : null);
  const canCalc = profile?.sex != null && birth != null && profile?.height_cm != null && lastWeightKg != null;
  const age = birth ? Math.max(10, year - Number(birth.slice(0, 4))) : 30;

  const plan = canCalc
    ? computeMacroPlan({
        sex: profile!.sex as "male" | "female",
        age,
        heightCm: Number(profile!.height_cm),
        weightKg: lastWeightKg!,
        activity: (profile!.activity_level as ActivityLevel) ?? "moderate",
        preset,
      })
    : null;

  function applyPlan() {
    if (!plan) return;
    setF({
      kcal: String(plan.kcal),
      proteinG: String(plan.proteinG),
      carbsG: String(plan.carbsG),
      fatG: String(plan.fatG),
      waterMl: String(plan.waterMl),
    });
    setMode("auto");
  }

  const kcalFromMacros = num(f.proteinG) * 4 + num(f.carbsG) * 4 + num(f.fatG) * 9;
  const mismatch = Math.abs(kcalFromMacros - num(f.kcal)) > 60;

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await setNutritionGoals({
        kcal: Math.round(num(f.kcal)),
        proteinG: Math.round(num(f.proteinG)),
        carbsG: Math.round(num(f.carbsG)),
        fatG: Math.round(num(f.fatG)),
        waterMl: Math.round(num(f.waterMl)),
        mode,
        calcInputs:
          mode === "auto" && canCalc
            ? {
                sex: profile!.sex as "male" | "female",
                age,
                heightCm: Number(profile!.height_cm),
                weightKg: lastWeightKg!,
                activity: (profile!.activity_level as ActivityLevel) ?? "moderate",
                preset,
              }
            : null,
      });
      setMsg(res.ok ? { ok: true, text: "Objetivos guardados." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="stack">
      <div className="card">
        <h2 className="panel-title">Calculadora automática</h2>
        {!canCalc ? (
          <p className="note">
            Completá tu sexo, año de nacimiento y altura en la pestaña <b>Perfil</b>, y registrá tu peso, para calcular
            tus macros automáticamente.
          </p>
        ) : (
          <>
            <div className="chip-row">
              {(Object.keys(PRESET_META) as GoalPreset[]).map((p) => (
                <button key={p} className={`chip${preset === p ? " on" : ""}`} onClick={() => setPreset(p)}>
                  {PRESET_META[p].label}
                </button>
              ))}
            </div>
            <p className="note">{PRESET_META[preset].hint}</p>

            <div className="calc-out">
              <div>
                <span className="eyebrow">Gasto basal</span>
                <b>{nf(plan!.bmr)} kcal</b>
              </div>
              <div>
                <span className="eyebrow">Gasto total</span>
                <b>{nf(plan!.tdee)} kcal</b>
              </div>
              <div>
                <span className="eyebrow">Tu objetivo</span>
                <b>{nf(plan!.kcal)} kcal</b>
              </div>
            </div>
            <div className="calc-macros">
              P {nf(plan!.proteinG)} g · C {nf(plan!.carbsG)} g · G {nf(plan!.fatG)} g
            </div>
            {plan!.warnings.map((w) => (
              <p className="warn" key={w}>
                ⚠ {w}
              </p>
            ))}
            <button className="btn-dark-sm" onClick={applyPlan}>
              <Sparkles size={16} />
              Usar estos valores
            </button>
            <p className="note">Es una estimación: ajustá según cómo respondas.</p>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="panel-title">Tus objetivos diarios</h2>
        <div className="chip-row">
          {(
            [
              ["auto", "Calculado"],
              ["manual", "Manual"],
              ["imported", "Plan de nutricionista"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={`chip${mode === k ? " on" : ""}`} onClick={() => setMode(k)}>
              {l}
            </button>
          ))}
        </div>

        {/* Reparto calórico en vivo: se ve cómo mueven los macros al editarlos. */}
        <div className="macro-split">
          <i style={{ width: `${(num(f.proteinG) * 4 * 100) / (kcalFromMacros || 1)}%`, background: "var(--red)" }} />
          <i style={{ width: `${(num(f.carbsG) * 4 * 100) / (kcalFromMacros || 1)}%`, background: "var(--amber)" }} />
          <i style={{ width: `${(num(f.fatG) * 9 * 100) / (kcalFromMacros || 1)}%`, background: "var(--blue)" }} />
        </div>
        <div className="split-legend">
          <span>
            <span className="dotk" style={{ background: "var(--red)" }} />
            🍗 Proteína {Math.round((num(f.proteinG) * 4 * 100) / (kcalFromMacros || 1))}%
          </span>
          <span>
            <span className="dotk" style={{ background: "var(--amber)" }} />
            🌾 Carbos {Math.round((num(f.carbsG) * 4 * 100) / (kcalFromMacros || 1))}%
          </span>
          <span>
            <span className="dotk" style={{ background: "var(--blue)" }} />
            🥑 Grasa {Math.round((num(f.fatG) * 9 * 100) / (kcalFromMacros || 1))}%
          </span>
        </div>

        <div className="form-grid">
          {(
            [
              ["kcal", "🔥 Calorías", "kcal"],
              ["proteinG", "🍗 Proteína", "g"],
              ["carbsG", "🌾 Carbos", "g"],
              ["fatG", "🥑 Grasa", "g"],
              ["waterMl", "💧 Agua", "ml"],
            ] as const
          ).map(([k, l, u]) => (
            <label key={k} className="field field-unit">
              <span>{l}</span>
              <span className="input-wrap">
                <input className="ci-input" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                <small>{u}</small>
              </span>
              {k !== "waterMl" && k !== "kcal" && (
                <small className="per-kg">
                  {lastWeightKg ? `${(num(f[k]) / lastWeightKg).toFixed(1)} g/kg de peso` : ""}
                </small>
              )}
            </label>
          ))}
        </div>

        {mismatch && (
          <p className="warn">
            ⚠ Tus macros suman {nf(kcalFromMacros)} kcal y el objetivo dice {nf(num(f.kcal))}. Revisá los números.
          </p>
        )}
        {msg && <p className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</p>}

        <button className="btn-dark" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar objetivos"}
        </button>
      </div>
    </div>
  );
}
