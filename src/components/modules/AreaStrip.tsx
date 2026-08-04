import { Ring } from "@/components/ui/Ring";
import { AREA_LABELS, type AreaKey } from "@/lib/calculations/scoring";

const ORDER: AreaKey[] = ["nutrition", "activity", "focus", "study", "habits", "rest"];
const COLOR: Partial<Record<AreaKey, string>> = { nutrition: "var(--red)", rest: "var(--blue)" };

export function AreaStrip({ breakdown }: { breakdown: Record<AreaKey, number> }) {
  return (
    <>
      <div className="astrip-t">Áreas de hoy</div>
      <div className="astrip">
        {ORDER.map((k) => {
          const v = breakdown[k];
          const hasData = v >= 0;
          return (
            <div key={k} className={`acard${hasData ? "" : " soon"}`}>
              <div className="ar">
                <Ring size={54} stroke={7} value={hasData ? v / 100 : 0} color={COLOR[k] ?? "var(--ink)"} track="var(--surface-2)">
                  <span className="num">{hasData ? v : "—"}</span>
                </Ring>
              </div>
              <div className="an">{AREA_LABELS[k]}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
