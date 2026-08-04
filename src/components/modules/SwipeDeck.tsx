"use client";

import { useRef, useState } from "react";

/**
 * Carrusel deslizable en móvil que se despliega como grid en pantallas
 * grandes: evita el scroll largo sin esconder nada en desktop.
 */
export function SwipeDeck({
  labels,
  children,
}: {
  labels: string[];
  children: React.ReactNode[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const box = ref.current;
    if (!box) return;
    // El índice sale del centro visible, no de un ancho asumido por página.
    const center = box.scrollLeft + box.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    Array.from(box.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const c = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(c - center);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best !== active) setActive(best);
  }

  function goTo(i: number) {
    const box = ref.current;
    const el = box?.children[i] as HTMLElement | undefined;
    if (!box || !el) return;
    box.scrollTo({ left: el.offsetLeft - box.offsetLeft, behavior: "smooth" });
  }

  return (
    <div className="deck">
      <div className="deck-track" ref={ref} onScroll={onScroll}>
        {children.map((c, i) => (
          <div className="deck-page" key={i} aria-hidden={false}>
            {c}
          </div>
        ))}
      </div>

      <div className="deck-dots" role="tablist" aria-label="Secciones">
        {labels.map((l, i) => (
          <button
            key={l}
            role="tab"
            aria-selected={i === active}
            className={`deck-dot${i === active ? " on" : ""}`}
            onClick={() => goTo(i)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
