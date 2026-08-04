"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { nf } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { HabitKind } from "@/types";

function Stepper({
  label,
  value,
  unit,
  step,
  min,
  decimals = 0,
  compact = false,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  decimals?: number;
  compact?: boolean;
  onChange: (v: number) => void;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className={`stepper${compact ? " compact" : ""}`}>
      <div className="sp-info">
        <div className="sp-lbl">{label}</div>
        <div className="sp-val">
          {nf(value, decimals)} <small>{unit}</small>
        </div>
      </div>
      <div className="sp-ctrls">
        <button className="sp-btn" onClick={() => onChange(Math.max(min, round(value - step)))} aria-label="Menos">
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <button className="sp-btn" onClick={() => onChange(round(value + step))} aria-label="Más">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

interface HabitDef {
  id: string;
  name: string;
  emoji: string;
  kind: HabitKind;
  target?: { unit: string; step: number; decimals?: number; suggested: number | "water" };
  supps?: boolean;
}

const HABITS: HabitDef[] = [
  { id: "agua", name: "Beber agua", emoji: "💧", kind: "numeric", target: { unit: "L", step: 0.1, decimals: 1, suggested: "water" } },
  { id: "comidas", name: "Registrar comidas", emoji: "🍽", kind: "boolean" },
  { id: "planificar", name: "Planificar el día", emoji: "🗓", kind: "boolean" },
  { id: "suplementos", name: "Suplementos", emoji: "💊", kind: "boolean", supps: true },
  { id: "caminar", name: "Caminar", emoji: "🚶", kind: "numeric", target: { unit: "pasos", step: 500, suggested: 8000 } },
  { id: "entrenar", name: "Entrenar", emoji: "🏋️", kind: "weekly", target: { unit: "x/sem", step: 1, suggested: 4 } },
  { id: "dormir", name: "Dormir", emoji: "😴", kind: "numeric", target: { unit: "h", step: 0.5, decimals: 1, suggested: 7.5 } },
  { id: "leer", name: "Leer", emoji: "📚", kind: "duration", target: { unit: "min", step: 5, suggested: 20 } },
  { id: "estirar", name: "Estirar", emoji: "🧘", kind: "duration", target: { unit: "min", step: 5, suggested: 10 } },
  { id: "meditar", name: "Meditar", emoji: "🧠", kind: "duration", target: { unit: "min", step: 5, suggested: 10 } },
  { id: "sinazucar", name: "Sin azúcar", emoji: "🚫", kind: "boolean" },
];

const STEPS = ["Tu peso", "Tus macros", "Tus hábitos", "Objetivos", "Listo"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [weight, setWeight] = useState(82);
  const [target, setTarget] = useState(80);
  const [kcal, setKcal] = useState(1950);
  const [protein, setProtein] = useState(140);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(65);
  const [selected, setSelected] = useState<string[]>(["agua", "comidas", "caminar", "entrenar", "dormir"]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [supps, setSupps] = useState<string[]>(["Creatina", "Vitamina D"]);
  const [suppInput, setSuppInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const waterSuggested = Math.max(2, Math.round(weight * 0.033 * 10) / 10);
  const suggestedFor = (h: HabitDef) =>
    h.target ? (h.target.suggested === "water" ? waterSuggested : h.target.suggested) : 0;
  const valueFor = (h: HabitDef) => targets[h.id] ?? suggestedFor(h);

  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const macroKcal = pKcal + cKcal + fKcal || 1;

  const selectedHabits = HABITS.filter((h) => selected.includes(h.id));
  const withTargets = selectedHabits.filter((h) => h.target || h.supps);
  const booleanOnes = selectedHabits.filter((h) => !h.target && !h.supps);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function addSupp() {
    const v = suppInput.trim();
    if (v && !supps.includes(v)) setSupps([...supps, v]);
    setSuppInput("");
  }
  async function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    // Último paso: guardar todo en Supabase.
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const aguaHabit = HABITS.find((h) => h.id === "agua")!;
      const waterMl = selected.includes("agua") ? Math.round(valueFor(aguaHabit) * 1000) : 2500;

      await supabase.from("profiles").upsert({ id: user.id, target_weight_kg: target });
      await supabase.from("user_settings").upsert({ user_id: user.id });
      await supabase.from("nutrition_goals").insert({
        user_id: user.id,
        effective_from: today,
        kcal,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        water_ml: waterMl,
      });
      const habitRows = selectedHabits.map((h) => ({
        user_id: user.id,
        name: h.id === "suplementos" && supps.length ? `Suplementos: ${supps.join(", ")}` : h.name,
        kind: h.kind,
        target_value: h.target ? valueFor(h) : null,
        unit: h.target?.unit ?? null,
      }));
      if (habitRows.length) await supabase.from("habits").insert(habitRows);
      await supabase
        .from("body_entries")
        .upsert({ user_id: user.id, log_date: today, weight_kg: weight }, { onConflict: "user_id,log_date" });

      router.push("/today");
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar. Probá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="wizard">
      <div className="wz-progress">
        {STEPS.map((_, i) => (
          <div key={i} className={`seg-bar${i <= step ? " on" : ""}`} />
        ))}
      </div>

      <div className="wz-step">
        {step === 0 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">⚖️</span>
              <h2>Tu peso</h2>
            </div>
            <p className="sub">¿Dónde estás hoy y a dónde querés llegar?</p>
            <Stepper label="Peso actual" value={weight} unit="kg" step={1} min={30} onChange={setWeight} />
            <Stepper label="Peso objetivo" value={target} unit="kg" step={1} min={30} onChange={setTarget} />
            <p className="sub" style={{ marginTop: 16 }}>
              {target < weight
                ? `A bajar ${nf(weight - target)} kg. ¡Vamos!`
                : target > weight
                ? `A subir ${nf(target - weight)} kg. ¡Vamos!`
                : "Mantenimiento."}
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">🎯</span>
              <h2>Tus macros</h2>
            </div>
            <p className="sub">Tu objetivo diario. Podés cambiarlo cuando quieras.</p>
            <div className="macro-split">
              <i style={{ width: `${(pKcal / macroKcal) * 100}%`, background: "var(--red)" }} />
              <i style={{ width: `${(cKcal / macroKcal) * 100}%`, background: "var(--amber)" }} />
              <i style={{ width: `${(fKcal / macroKcal) * 100}%`, background: "var(--blue)" }} />
            </div>
            <div className="split-legend">
              <span>
                <span className="dotk" style={{ background: "var(--red)" }} />
                Proteína {Math.round((pKcal / macroKcal) * 100)}%
              </span>
              <span>
                <span className="dotk" style={{ background: "var(--amber)" }} />
                Carbos {Math.round((cKcal / macroKcal) * 100)}%
              </span>
              <span>
                <span className="dotk" style={{ background: "var(--blue)" }} />
                Grasa {Math.round((fKcal / macroKcal) * 100)}%
              </span>
            </div>
            <Stepper label="Calorías" value={kcal} unit="kcal" step={50} min={800} onChange={setKcal} />
            <Stepper label="Proteína" value={protein} unit="g" step={5} min={0} onChange={setProtein} />
            <Stepper label="Carbohidratos" value={carbs} unit="g" step={5} min={0} onChange={setCarbs} />
            <Stepper label="Grasas" value={fat} unit="g" step={5} min={0} onChange={setFat} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">✅</span>
              <h2>Tus hábitos</h2>
            </div>
            <p className="sub">Elegí los que quieras seguir. En el próximo paso ponés el objetivo de cada uno.</p>
            <div className="chip-grid">
              {HABITS.map((h) => {
                const on = selected.includes(h.id);
                return (
                  <button key={h.id} className={`chip${on ? " on" : ""}`} onClick={() => toggle(h.id)}>
                    <span className="cemoji">{h.emoji}</span>
                    {h.name}
                    <span className="cx">{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">🎚️</span>
              <h2>Tus objetivos</h2>
            </div>
            <p className="sub">Ajustá la meta diaria de cada hábito. Dejamos un valor sugerido; después lo editás en su pantalla.</p>

            {withTargets.map((h) =>
              h.supps ? (
                <div key={h.id} className="per-group">
                  <div className="per-title">
                    <span className="pe">{h.emoji}</span> Suplementos diarios
                  </div>
                  <p className="per-hint">Cargá los que tomás. Después los marcás cada día en su pantalla.</p>
                  <div className="supps-add">
                    <input
                      value={suppInput}
                      onChange={(e) => setSuppInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSupp()}
                      placeholder="Ej. Creatina, Omega 3…"
                    />
                    <button className="add" onClick={addSupp}>
                      Agregar
                    </button>
                  </div>
                  <div className="supp-tags">
                    {supps.map((s) => (
                      <span key={s} className="supp-tag">
                        {s}
                        <button onClick={() => setSupps(supps.filter((x) => x !== s))} aria-label={`Quitar ${s}`}>
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={h.id} className="per-group">
                  <div className="per-title">
                    <span className="pe">{h.emoji}</span> {h.name}
                  </div>
                  <p className="per-hint">
                    Sugerido: {nf(suggestedFor(h), h.target!.decimals ?? 0)} {h.target!.unit}
                    {h.id === "agua" ? " (según tu peso)" : ""}
                  </p>
                  <Stepper
                    compact
                    label="Objetivo diario"
                    value={valueFor(h)}
                    unit={h.target!.unit}
                    step={h.target!.step}
                    min={0}
                    decimals={h.target!.decimals ?? 0}
                    onChange={(v) => setTargets((t) => ({ ...t, [h.id]: v }))}
                  />
                </div>
              )
            )}

            {booleanOnes.length > 0 && (
              <p className="per-hint" style={{ marginTop: 16 }}>
                Sin objetivo numérico (se marcan a diario): {booleanOnes.map((h) => h.name).join(", ")}.
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">🎉</span>
              <h2>¡Todo listo!</h2>
            </div>
            <p className="sub">Este es tu punto de partida.</p>
            <div className="wz-summary">
              <div className="row">
                <span>Peso</span>
                <b>
                  {nf(weight)} → {nf(target)} kg
                </b>
              </div>
              <div className="row">
                <span>Calorías</span>
                <b>{nf(kcal)} kcal</b>
              </div>
              <div className="row">
                <span>Macros (P / C / G)</span>
                <b>
                  {nf(protein)} / {nf(carbs)} / {nf(fat)} g
                </b>
              </div>
              {selectedHabits.some((h) => h.id === "agua") && (
                <div className="row">
                  <span>Agua</span>
                  <b>{nf(valueFor(HABITS.find((h) => h.id === "agua")!), 1)} L/día</b>
                </div>
              )}
              {selectedHabits.some((h) => h.id === "caminar") && (
                <div className="row">
                  <span>Pasos</span>
                  <b>{nf(valueFor(HABITS.find((h) => h.id === "caminar")!))} /día</b>
                </div>
              )}
              <div className="row">
                <span>Hábitos</span>
                <b>{selected.length} seleccionados</b>
              </div>
              {selected.includes("suplementos") && supps.length > 0 && (
                <div className="row">
                  <span>Suplementos</span>
                  <b>{supps.length} cargados</b>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {saveError && (
        <p style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, margin: "10px 2px 0" }}>{saveError}</p>
      )}
      <div className="wz-foot">
        {step > 0 && !saving && (
          <button className="wz-back" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        )}
        <button className="wz-next" onClick={next} disabled={saving}>
          {saving ? "Guardando…" : step === STEPS.length - 1 ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
