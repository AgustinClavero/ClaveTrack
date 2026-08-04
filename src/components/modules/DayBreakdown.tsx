import { Check, X } from "lucide-react";
import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";
import type { DayDetail } from "@/lib/data/queries";

/** Qué se cumplió y qué no, día por día. */
export function DayBreakdown({ days, threshold }: { days: DayDetail[]; threshold: number }) {
  if (days.length === 0) {
    return (
      <section className="card">
        <span className="eyebrow">Tus días</span>
        <p className="note">Todavía no hay días registrados. Empezá marcando algo hoy.</p>
      </section>
    );
  }

  return (
    <section className="card daylist">
      <div className="dc-head">
        <span className="eyebrow">Cómo viene cada día</span>
        <span className="dc-pct">{days.filter((d) => d.total >= threshold).length} cumplidos</span>
      </div>

      <div className="dl-rows">
        {days.map((d) => (
          <article key={d.date} className={`dl-row${d.total >= threshold ? " met" : ""}`}>
            <div className="dl-date">
              <Ring size={44} stroke={5} value={d.total / 100} color="var(--ink)" track="var(--surface-2)" centerFontSize={13}>
                <b>{d.total}</b>
              </Ring>
              <span>
                <b>{d.label}</b>
                <small>{d.total >= threshold ? "Día cumplido" : `Debajo del ${threshold}%`}</small>
              </span>
            </div>

            <ul className="dl-items">
              {d.items.map((i) => (
                <li key={i.label} className={i.done ? "ok" : "no"}>
                  <span className="dl-ic">{i.done ? <Check size={11} strokeWidth={3.5} /> : <X size={11} strokeWidth={3} />}</span>
                  {i.emoji} {i.label}
                  {i.detail && <small>{i.detail}</small>}
                </li>
              ))}
              {d.items.length === 0 && <li className="dl-empty">Sin registros</li>}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
