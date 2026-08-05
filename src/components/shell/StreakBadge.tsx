/** Racha del usuario en el sidebar: el dato manda, el número va grande. */
export function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className="streak-badge">
      <div className="sb-num">🔥 {streak}</div>
      <div className="eyebrow">Racha de días</div>
    </div>
  );
}
