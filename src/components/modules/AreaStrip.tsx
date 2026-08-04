import { Ring } from "@/components/ui/Ring";
import { AREA_LABELS, type AreaKey } from "@/lib/calculations/scoring";

const ORDER: AreaKey[] = ["nutrition", "habits", "rest", "activity", "focus", "study"];

/** Acento por área: acompaña el color que usa cada página. */
const ACCENT: Record<AreaKey, { c: string; t: string }> = {
  nutrition: { c: "var(--red)", t: "var(--red-tint)" },
  habits: { c: "var(--amber)", t: "var(--amber-tint)" },
  rest: { c: "var(--blue)", t: "var(--blue-tint)" },
  activity: { c: "var(--blue)", t: "var(--blue-tint)" },
  focus: { c: "var(--amber)", t: "var(--amber-tint)" },
  study: { c: "var(--success)", t: "var(--surface-2)" },
};

/** Áreas aún sin módulo: se muestran atenuadas con su motivo. */
const PENDING: Partial<Record<AreaKey, string>> = {
  activity: "pronto",
  focus: "pronto",
  study: "pronto",
};

export function AreaStrip({ breakdown }: { breakdown: Record<AreaKey, number> }) {
  return (
    <section className="astrip-wrap">
      <div className="eyebrow astrip-t">Áreas de hoy</div>
      <div className="astrip">
        {ORDER.map((k) => {
          const v = breakdown[k];
          const hasData = v >= 0;
          return (
            <div key={k} className={`acard${hasData ? "" : " soon"}`}>
              <div className="ar">
                <Ring size={54} stroke={7} value={hasData ? v / 100 : 0} color={ACCENT[k].c} track={ACCENT[k].t}>
                  <span className="num">{hasData ? v : "—"}</span>
                </Ring>
              </div>
              <div className="an">{AREA_LABELS[k]}</div>
              {!hasData && PENDING[k] && <div className="as">{PENDING[k]}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
