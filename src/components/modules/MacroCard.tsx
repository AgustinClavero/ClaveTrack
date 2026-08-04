import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";

/** Card de macro: valor arriba, anillo abajo (referencia Cal AI). */
export function MacroCard({
  label,
  value,
  goal,
  emoji,
  color,
  tint,
}: {
  label: string;
  value: number;
  goal: number;
  emoji: string;
  color: string;
  tint: string;
}) {
  return (
    <div className="card macro-card">
      <div className="mc-val">
        {nf(value)}
        <small>/{nf(goal)}g</small>
      </div>
      <div className="mc-lab">{label}</div>
      <Ring size={64} stroke={8} value={goal ? value / goal : 0} color={color} track={tint} centerFontSize={19}>
        {emoji}
      </Ring>
    </div>
  );
}
