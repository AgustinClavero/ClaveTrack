import * as React from "react";

interface RingProps {
  size?: number;
  stroke?: number;
  /** 0..1 */
  value: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  centerFontSize?: number;
}

/** Anillo de progreso circular (SVG). */
export function Ring({
  size = 96,
  stroke = 9,
  value,
  color = "var(--ink)",
  track = "var(--surface-2)",
  children,
  centerFontSize = 22,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const offset = c * (1 - pct);
  return (
    <div className="pring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="cen" style={{ fontSize: centerFontSize }}>
        {children}
      </div>
    </div>
  );
}
