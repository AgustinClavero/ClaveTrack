"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { nf } from "@/lib/utils";

interface Stepperable {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  onChange: (v: number) => void;
}

function Stepper({ label, value, unit, step, min, onChange }: Stepperable) {
  return (
    <div className="stepper">
      <div className="sp-info">
        <div className="sp-lbl">{label}</div>
        <div className="sp-val">
          {nf(value)} <small>{unit}</small>
        </div>
      </div>
      <div className="sp-ctrls">
        <button className="sp-btn" onClick={() => onChange(Math.max(min, value - step))} aria-label="Menos">
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <button className="sp-btn" onClick={() => onChange(value + step)} aria-label="Más">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

const ALL_HABITS = [
  { id: "agua", name: "Beber agua", emoji: "💧" },
  { id: "comidas", name: "Registrar comidas", emoji: "🍽" },
  { id: "planificar", name: "Planificar el día", emoji: "🗓" },
  { id: "suplementos", name: "Suplementos", emoji: "💊" },
  { id: "caminar", name: "Caminar", emoji: "🚶" },
  { id: "entrenar", name: "Entrenar", emoji: "🏋️" },
  { id: "dormir", name: "Dormir 7 h", emoji: "😴" },
  { id: "leer", name: "Leer", emoji: "📚" },
  { id: "estirar", name: "Estirar", emoji: "🧘" },
  { id: "meditar", name: "Meditar", emoji: "🧠" },
  { id: "pasos", name: "8.000 pasos", emoji: "👟" },
  { id: "sinazucar", name: "Sin azúcar", emoji: "🚫" },
];

const STEPS = ["Tu peso", "Tus macros", "Tus hábitos", "Listo"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [weight, setWeight] = useState(82);
  const [target, setTarget] = useState(80);
  const [kcal, setKcal] = useState(1950);
  const [protein, setProtein] = useState(140);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(65);
  const [habits, setHabits] = useState<string[]>([
    "agua",
    "comidas",
    "entrenar",
    "dormir",
  ]);

  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const macroKcal = pKcal + cKcal + fKcal || 1;

  function toggleHabit(id: string) {
    setHabits((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else router.push("/today");
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
            <div className="wz-emoji">⚖️</div>
            <h2>Tu peso</h2>
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
            <div className="wz-emoji">🎯</div>
            <h2>Tus macros</h2>
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
            <div className="wz-emoji">✅</div>
            <h2>Tus hábitos</h2>
            <p className="sub">Elegí los que quieras seguir. Podés sumar más después.</p>
            <div className="chip-grid">
              {ALL_HABITS.map((h) => {
                const on = habits.includes(h.id);
                return (
                  <button key={h.id} className={`chip${on ? " on" : ""}`} onClick={() => toggleHabit(h.id)}>
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
            <div className="wz-emoji">🎉</div>
            <h2>¡Todo listo!</h2>
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
              <div className="row">
                <span>Hábitos</span>
                <b>{habits.length} seleccionados</b>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="wz-foot">
        {step > 0 && (
          <button className="wz-back" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        )}
        <button className="wz-next" onClick={next}>
          {step === STEPS.length - 1 ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
