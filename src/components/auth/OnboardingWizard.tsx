"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Sparkles, X } from "lucide-react";
import { nf } from "@/lib/utils";
import { completeOnboarding } from "@/app/actions";
import {
  ACTIVITY_LABELS,
  PRESET_META,
  computeMacroPlan,
  type ActivityLevel,
  type GoalPreset,
  type Sex,
} from "@/lib/calculations/tdee";
import type { HabitKind } from "@/types";

function Stepper({
  label,
  value,
  unit,
  step,
  min,
  decimals = 0,
  compact = false,
  editable = false,
  plain = false,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  decimals?: number;
  compact?: boolean;
  editable?: boolean;
  /** Sin separador de miles (años). */
  plain?: boolean;
  onChange: (v: number) => void;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const [text, setText] = useState<string | null>(null);
  const show = (v: number) => (plain ? String(v) : nf(v, decimals));

  function commit(raw: string) {
    const v = parseFloat(raw.replace(",", "."));
    if (!isNaN(v)) onChange(Math.max(min, round(v)));
    setText(null);
  }

  return (
    <div className={`stepper${compact ? " compact" : ""}`}>
      <div className="sp-info">
        <div className="sp-lbl">{label}</div>
        {editable ? (
          <div className="sp-val">
            <input
              className="sp-val-input"
              type="text"
              inputMode="decimal"
              value={text ?? show(value)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setText(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />{" "}
            <small>{unit}</small>
          </div>
        ) : (
          <div className="sp-val">
            {show(value)} <small>{unit}</small>
          </div>
        )}
      </div>
      <div className="sp-ctrls">
        <button
          className="sp-btn"
          onClick={() => {
            setText(null);
            onChange(Math.max(min, round(value - step)));
          }}
          aria-label="Menos"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <button
          className="sp-btn"
          onClick={() => {
            setText(null);
            onChange(round(value + step));
          }}
          aria-label="Más"
        >
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
  isKey?: boolean;
  target?: { unit: string; step: number; decimals?: number; suggested: number | "water" };
  supps?: boolean;
}

const HABITS: HabitDef[] = [
  { id: "agua", name: "Beber agua", emoji: "💧", kind: "numeric", isKey: true, target: { unit: "L", step: 0.1, decimals: 1, suggested: "water" } },
  { id: "comidas", name: "Registrar comidas", emoji: "🍽", kind: "boolean" },
  { id: "planificar", name: "Planificar el día", emoji: "🗓", kind: "boolean" },
  { id: "suplementos", name: "Suplementos", emoji: "💊", kind: "boolean", supps: true },
  { id: "caminar", name: "Caminar", emoji: "🚶", kind: "numeric", isKey: true, target: { unit: "pasos", step: 500, suggested: 8000 } },
  { id: "entrenar", name: "Entrenar", emoji: "🏋️", kind: "weekly", target: { unit: "x/sem", step: 1, suggested: 4 } },
  { id: "dormir", name: "Dormir", emoji: "😴", kind: "numeric", isKey: true, target: { unit: "h", step: 0.5, decimals: 1, suggested: 7.5 } },
  { id: "leer", name: "Leer", emoji: "📚", kind: "duration", target: { unit: "min", step: 5, suggested: 20 } },
  { id: "estirar", name: "Estirar", emoji: "🧘", kind: "duration", target: { unit: "min", step: 5, suggested: 10 } },
  { id: "meditar", name: "Meditar", emoji: "🧠", kind: "duration", target: { unit: "min", step: 5, suggested: 10 } },
  { id: "sinazucar", name: "Sin azúcar", emoji: "🚫", kind: "boolean" },
];

const STEPS = ["Sobre vos", "Tu peso", "Tu plan", "Tus hábitos", "Objetivos", "Listo"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Paso 0 — datos personales (habilitan la calculadora)
  const currentYear = new Date().getFullYear();
  const [sex, setSex] = useState<Sex>("male");
  const [birthYear, setBirthYear] = useState(currentYear - 30);
  const [heightCm, setHeightCm] = useState(175);
  const [activity, setActivity] = useState<ActivityLevel>("moderate");

  // Paso 1 — peso
  const [weight, setWeight] = useState(82);
  const [target, setTarget] = useState(80);

  // Paso 2 — plan nutricional
  const [mode, setMode] = useState<"auto" | "manual" | "imported">("auto");
  const [preset, setPreset] = useState<GoalPreset>("moderate_cut");
  const [kcal, setKcal] = useState(1950);
  const [protein, setProtein] = useState(140);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(65);
  const [applied, setApplied] = useState(false);

  // Pasos 3-4 — hábitos
  const [selected, setSelected] = useState<string[]>(["agua", "comidas", "caminar", "entrenar", "dormir"]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [supps, setSupps] = useState<string[]>([]);
  const [suppInput, setSuppInput] = useState("");

  const plan = useMemo(
    () =>
      computeMacroPlan({
        sex,
        age: currentYear - birthYear,
        heightCm,
        weightKg: weight,
        activity,
        preset,
      }),
    [sex, birthYear, heightCm, weight, activity, preset, currentYear]
  );

  function applyPlan() {
    setKcal(plan.kcal);
    setProtein(plan.proteinG);
    setCarbs(plan.carbsG);
    setFat(plan.fatG);
    setApplied(true);
  }

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

  /** Aplana la selección a filas de hábito (los suplementos van uno por uno). */
  function buildHabits() {
    const rows: {
      slug: string;
      name: string;
      kind: HabitKind;
      targetValue: number | null;
      unit: string | null;
      emoji: string | null;
      isKey: boolean;
    }[] = [];

    selectedHabits.forEach((h) => {
      if (h.supps) {
        supps.forEach((s) =>
          rows.push({
            slug: `supp-${s.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`,
            name: s,
            kind: "boolean",
            targetValue: null,
            unit: null,
            emoji: "💊",
            isKey: false,
          })
        );
        return;
      }
      rows.push({
        slug: h.id,
        name: h.name,
        kind: h.kind,
        targetValue: h.target ? valueFor(h) : null,
        unit: h.target?.unit ?? null,
        emoji: h.emoji,
        isKey: !!h.isKey,
      });
    });
    return rows;
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaveError(null);
    const habits = buildHabits();
    if (habits.length === 0) {
      setSaveError("Elegí al menos un hábito para seguir.");
      setStep(3);
      return;
    }

    const aguaHabit = HABITS.find((h) => h.id === "agua")!;
    const waterMl = selected.includes("agua") ? Math.round(valueFor(aguaHabit) * 1000) : 2500;

    startTransition(async () => {
      const res = await completeOnboarding({
        profile: {
          sex,
          birthYear,
          heightCm,
          activityLevel: activity,
          weightKg: weight,
          targetWeightKg: target,
        },
        goals: {
          kcal,
          proteinG: protein,
          carbsG: carbs,
          fatG: fat,
          waterMl,
          mode,
          calcInputs:
            mode === "auto"
              ? { sex, age: currentYear - birthYear, heightCm, weightKg: weight, activity, preset }
              : null,
        },
        habits,
      });

      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      router.push("/today");
      router.refresh();
    });
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
              <span className="wz-emoji">👤</span>
              <h2>Sobre vos</h2>
            </div>
            <p className="sub">Con esto calculamos tus calorías. Nada de esto se comparte.</p>

            <div className="field">
              <span>Sexo biológico</span>
              <div className="chip-row">
                {(
                  [
                    ["male", "Masculino"],
                    ["female", "Femenino"],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} className={`chip${sex === k ? " on" : ""}`} onClick={() => setSex(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <Stepper
              label="Año de nacimiento"
              value={birthYear}
              unit={`· ${currentYear - birthYear} años`}
              step={1}
              min={1900}
              editable
              plain
              onChange={setBirthYear}
            />
            <Stepper label="Altura" value={heightCm} unit="cm" step={1} min={100} editable onChange={setHeightCm} />

            <div className="field">
              <span>Nivel de actividad</span>
              <div className="stack-sm">
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                  <button key={k} className={`opt-row${activity === k ? " on" : ""}`} onClick={() => setActivity(k)}>
                    {ACTIVITY_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">⚖️</span>
              <h2>Tu peso</h2>
            </div>
            <p className="sub">¿Dónde estás hoy y a dónde querés llegar?</p>
            <Stepper label="Peso actual" value={weight} unit="kg" step={0.1} min={30} decimals={1} editable onChange={setWeight} />
            <Stepper label="Peso objetivo" value={target} unit="kg" step={0.1} min={30} decimals={1} editable onChange={setTarget} />
            <p className="sub" style={{ marginTop: 16 }}>
              {target < weight
                ? `A bajar ${nf(weight - target, 1)} kg. ¡Vamos!`
                : target > weight
                  ? `A subir ${nf(target - weight, 1)} kg. ¡Vamos!`
                  : "Mantenimiento."}
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">🎯</span>
              <h2>Tu plan</h2>
            </div>
            <p className="sub">Podés calcularlo automáticamente o cargar el tuyo.</p>

            <div className="chip-row">
              {(
                [
                  ["auto", "Calcular por mí"],
                  ["manual", "Lo cargo yo"],
                  ["imported", "Plan de nutricionista"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={`chip${mode === k ? " on" : ""}`} onClick={() => setMode(k)}>
                  {l}
                </button>
              ))}
            </div>

            {mode === "auto" && (
              <>
                <div className="field">
                  <span>¿Qué ritmo querés?</span>
                  <div className="stack-sm">
                    {(Object.keys(PRESET_META) as GoalPreset[]).map((p) => (
                      <button
                        key={p}
                        className={`opt-row${preset === p ? " on" : ""}`}
                        onClick={() => {
                          setPreset(p);
                          setApplied(false);
                        }}
                      >
                        <b>{PRESET_META[p].label}</b>
                        <small style={{ display: "block", color: "var(--text-2)", marginTop: 2 }}>
                          {PRESET_META[p].hint}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="calc-out">
                  <div>
                    <span className="eyebrow">Gasto basal</span>
                    <b>{nf(plan.bmr)}</b>
                  </div>
                  <div>
                    <span className="eyebrow">Gasto total</span>
                    <b>{nf(plan.tdee)}</b>
                  </div>
                  <div>
                    <span className="eyebrow">Tu objetivo</span>
                    <b>{nf(plan.kcal)}</b>
                  </div>
                </div>
                <div className="calc-macros">
                  P {nf(plan.proteinG)} g · C {nf(plan.carbsG)} g · G {nf(plan.fatG)} g
                </div>
                {plan.warnings.map((w) => (
                  <p className="warn" key={w}>
                    ⚠ {w}
                  </p>
                ))}
                <button className="btn-dark-sm" onClick={applyPlan}>
                  <Sparkles size={16} />
                  {applied ? "Aplicado ✓" : "Usar estos valores"}
                </button>
                <p className="note">Es una estimación: ajustala según cómo respondas.</p>
              </>
            )}

            <div className="macro-split" style={{ marginTop: 20 }}>
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

            <Stepper label="Calorías" value={kcal} unit="kcal" step={50} min={800} editable onChange={setKcal} />
            <Stepper label="Proteína" value={protein} unit="g" step={5} min={0} editable onChange={setProtein} />
            <Stepper label="Carbohidratos" value={carbs} unit="g" step={5} min={0} editable onChange={setCarbs} />
            <Stepper label="Grasas" value={fat} unit="g" step={5} min={0} editable onChange={setFat} />

            {Math.abs(macroKcal - kcal) > 60 && (
              <p className="warn">
                ⚠ Tus macros suman {nf(macroKcal)} kcal y el objetivo dice {nf(kcal)}. Revisá los números.
              </p>
            )}
          </>
        )}

        {step === 3 && (
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

        {step === 4 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">🎚️</span>
              <h2>Tus objetivos</h2>
            </div>
            <p className="sub">Ajustá la meta diaria de cada hábito. Después los editás en Ajustes.</p>

            {withTargets.map((h) =>
              h.supps ? (
                <div key={h.id} className="per-group">
                  <div className="per-title">
                    <span className="pe">{h.emoji}</span> Suplementos diarios
                  </div>
                  <p className="per-hint">Cada uno se marca por separado en tu lista de hábitos.</p>
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

        {step === 5 && (
          <>
            <div className="wz-head">
              <span className="wz-emoji">🎉</span>
              <h2>¡Todo listo!</h2>
            </div>
            <p className="sub">Este es tu punto de partida. Todo se edita después en Ajustes.</p>
            <div className="wz-summary">
              <div className="row">
                <span>Peso</span>
                <b>
                  {nf(weight, 1)} → {nf(target, 1)} kg
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
              {selected.includes("agua") && (
                <div className="row">
                  <span>Agua</span>
                  <b>{nf(valueFor(HABITS.find((h) => h.id === "agua")!), 1)} L/día</b>
                </div>
              )}
              {selected.includes("caminar") && (
                <div className="row">
                  <span>Pasos</span>
                  <b>{nf(valueFor(HABITS.find((h) => h.id === "caminar")!))} /día</b>
                </div>
              )}
              <div className="row">
                <span>Hábitos</span>
                <b>{buildHabits().length} para seguir</b>
              </div>
            </div>
            <p className="note">También cargamos un catálogo de alimentos comunes para que registres al toque.</p>
          </>
        )}
      </div>

      {saveError && <p className="form-error">{saveError}</p>}

      <div className="wz-foot">
        {step > 0 && !pending && (
          <button className="wz-back" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        )}
        <button className="wz-next" onClick={next} disabled={pending}>
          {pending ? "Guardando…" : step === STEPS.length - 1 ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
