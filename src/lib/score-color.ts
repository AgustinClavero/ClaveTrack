/**
 * Color de un porcentaje de cumplimiento. El verde se gana: aparece recién
 * al final, para que llegar al 90 signifique algo. Una sola escala en toda
 * la app, así el mismo número siempre se ve del mismo color.
 */
export function scoreColor(pct: number): string {
  if (pct >= 90) return "var(--green)";
  if (pct >= 75) return "var(--lime)";
  if (pct >= 60) return "var(--amber)";
  if (pct >= 40) return "var(--orange)";
  return "var(--red)";
}

/** Fondo tenue del mismo tramo, para pistas de anillos y barras. */
export function scoreTint(pct: number): string {
  if (pct >= 90) return "var(--green-tint)";
  if (pct >= 75) return "var(--lime-tint)";
  if (pct >= 60) return "var(--amber-tint)";
  if (pct >= 40) return "var(--orange-tint)";
  return "var(--red-tint)";
}
