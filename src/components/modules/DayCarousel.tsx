"use client";

import { Children, useRef, useState } from "react";

export function DayCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (el.scrollWidth / count));
    setActive(Math.max(0, Math.min(count - 1, idx)));
  }

  return (
    <>
      <div className="dcar-h">
        <span className="t">Tu día</span>
        <span className="t" style={{ color: "var(--muted)" }}>
          desliza →
        </span>
      </div>
      <div className="dcar" ref={ref} onScroll={onScroll}>
        {children}
      </div>
      <div className="ddots">
        {Array.from({ length: count }, (_, i) => (
          <i key={i} className={i === active ? "on" : ""} />
        ))}
      </div>
    </>
  );
}
