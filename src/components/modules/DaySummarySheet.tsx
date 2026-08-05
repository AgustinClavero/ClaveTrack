"use client";

import { useEffect, useState } from "react";
import { X, Check, Lightbulb, TriangleAlert } from "lucide-react";
import { fetchDaySummary } from "@/app/actions";
import { useUIStore } from "@/lib/store";
import { NUTRITION_PART_LABELS, NUTRITION_PART_EMOJI } from "@/lib/calculations/nutrition-score";
import type { DaySummaryPayload } from "@/lib/data/queries";
import { Ring } from "@/components/ui/Ring";
import { scoreColor, scoreTint } from "@/lib/score-color";

const ICON = { good: Check, tip: Lightbulb, warn: TriangleAlert } as const;

/**
 * Resumen del día a pantalla completa. Se pide al abrir y no antes: es el
 * cierre del día, no algo que haya que traer en cada render de la app.
 */
export function DaySummarySheet() {
  const open = useUIStore((s) => s.activeSheet === "summary");
  const date = useUIStore((s) => s.summaryDate);
  const close = useUIStore((s) => s.closeSheet);

  const [data, setData] = useState<DaySummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !date) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchDaySummary(date).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [open, date]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open) return null;

  const s = data?.summary;
  const partKeys = data ? (Object.keys(data.parts) as (keyof typeof data.parts)[]).filter((k) => data.parts[k].hasData) : [];

  return (
    <div className="summary-full" role="dialog" aria-modal="true" aria-label="Resumen del día">
      <header className="sf-bar">
        <span className="eyebrow">Resumen del día</span>
        <button className="icon-btn" onClick={close} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>

      <div className="sf-body">
        {loading && <p className="note">Cerrando el día…</p>}
        {error && <p className="form-error">{error}</p>}

        {s && data && (
          <>
            <div className="sf-hero">
              <Ring size={132} stroke={13} value={s.score / 100} color={scoreColor(s.score)} track={scoreTint(s.score)} centerFontSize={38}>
                <b>{s.score}</b>
              </Ring>
              <h2>{s.headline}</h2>
              <p className="sf-date">{data.label.charAt(0).toUpperCase() + data.label.slice(1)}</p>
            </div>

            <ul className="sf-lines">
              {s.lines.map((l, i) => {
                const Icon = ICON[l.tone];
                return (
                  <li key={i} className={`ln-${l.tone}`}>
                    <span className="ds-ic">
                      <Icon size={14} strokeWidth={3} />
                    </span>
                    {l.text}
                  </li>
                );
              })}
            </ul>

            {partKeys.length > 0 && (
              <section className="sf-block">
                <span className="eyebrow">Cómo se compone</span>
                <div className="ds-parts">
                  {/* Nutrición primero: es el puntaje del que salen las líneas. */}
                  <div className="ds-part">
                    <span className="dsp-lab">
                      <i aria-hidden="true">🍽️</i> Nutrición
                    </span>
                    <span className="dsp-bar">
                      <i style={{ width: `${s.nutritionScore}%`, background: scoreColor(s.nutritionScore) }} />
                    </span>
                    <span className="dsp-val">{s.nutritionScore}%</span>
                  </div>
                  {partKeys.map((k) => (
                    <div key={k} className="ds-part">
                      <span className="dsp-lab">
                        <i aria-hidden="true">{NUTRITION_PART_EMOJI[k]}</i> {NUTRITION_PART_LABELS[k]}
                      </span>
                      <span className="dsp-bar">
                        <i style={{ width: `${data.parts[k].value}%`, background: scoreColor(data.parts[k].value) }} />
                      </span>
                      <span className="dsp-val">{data.parts[k].value}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="sf-streak">{s.streakNote}</p>
          </>
        )}

        {!loading && !error && s && !s.hasData && (
          <p className="note">Ese día no registraste comidas, así que no hay mucho que leer.</p>
        )}
      </div>
    </div>
  );
}
