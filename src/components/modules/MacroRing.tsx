import { Ring } from "@/components/ui/Ring";
import { nf } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  goal: number;
  emoji: string;
  color: string;
  tint: string;
}

/** Tarjeta de macro con anillo e ícono (estilo Cal AI). */
export function MacroRing({ label, value, goal, emoji, color, tint }: Props) {
  return (
    <div className="mcard">
      <div className="mnum">
        {nf(value)}
        <small>/{nf(goal)}</small>
      </div>
      <div className="mlbl">{label}</div>
      <div className="mring">
        <Ring size={64} stroke={7} value={goal ? value / goal : 0} color={color} track={tint} centerFontSize={19}>
          {emoji}
        </Ring>
      </div>
    </div>
  );
}
