"use client";

import { useEffect, useRef, useState } from "react";

/** Cada cuánto pasa solo a la página siguiente. */
const AUTOPLAY_MS = 6000;
/** Cuánto se queda quieto después de que el usuario lo toca. */
const PAUSE_MS = 15000;
/** Margen para que el snap termine antes de volver a escuchar gestos. */
const SETTLE_MS = 800;

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
  const [pageH, setPageH] = useState<number | undefined>(undefined);
  /** Hasta cuándo no auto-avanzar: se corre con cada gesto del usuario. */
  const pausedUntil = useRef(0);
  /** Página que pidió el propio carrusel y hasta cuándo dura su movimiento:
   *  el snap emite varios eventos y sin esto uno intermedio se lee como gesto. */
  const wanted = useRef<number | null>(null);
  const selfUntil = useRef(0);

  /**
   * Altura fija: la de la página más alta. Ajustarla a la activa hacía que
   * el bloque creciera y se achicara en cada deslizada, y todo lo de abajo
   * saltara con él. Las páginas cortas quedan alineadas arriba, sin estirarse.
   * En escritorio no aplica: ahí es un grid y se igualan a propósito.
   */
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const pages = Array.from(box.children) as HTMLElement[];

    const measure = () => {
      if (wide.matches) return setPageH(undefined);
      setPageH(Math.max(...pages.map((p) => p.getBoundingClientRect().height)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    pages.forEach((p) => ro.observe(p));
    wide.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, [children.length]);

  function onScroll() {
    const box = ref.current;
    if (!box) return;

    // Se compara con rects y no con offsetLeft: offsetLeft es relativo al
    // ancestro posicionado, que no siempre es el carrusel.
    const boxRect = box.getBoundingClientRect();
    const center = boxRect.left + boxRect.width / 2;
    let best = 0;
    let dist = Infinity;
    Array.from(box.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    const own = wanted.current === best || Date.now() < selfUntil.current;
    if (wanted.current === best) wanted.current = null;
    if (!own) pausedUntil.current = Date.now() + PAUSE_MS;

    if (best !== active) setActive(best);
  }

  function goTo(i: number) {
    pausedUntil.current = Date.now() + PAUSE_MS;
    move(i);
  }

  function move(i: number) {
    wanted.current = i;
    selfUntil.current = Date.now() + SETTLE_MS;
    const el = ref.current?.children[i] as HTMLElement | undefined;
    // Se marca acá y no se espera al evento de scroll: el salto programático
    // no siempre lo emite, y el botón quedaba sin señalar la página activa.
    setActive(i);
    // Salto directo: con scroll-snap obligatorio el desplazamiento suave
    // programático queda a mitad de camino y el botón parece no responder.
    // El deslizado con el dedo sigue siendo fluido; esto es solo el atajo.
    el?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }

  /**
   * Avance automático y circular: al llegar al final vuelve al principio.
   * Se frena mientras el usuario está tocando el carrusel y mientras la
   * pestaña no está a la vista; en escritorio no corre porque es un grid.
   */
  useEffect(() => {
    const n = children.length;
    if (n < 2) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    const id = setInterval(() => {
      if (wide.matches || still.matches || document.hidden) return;
      if (Date.now() < pausedUntil.current) return;
      setActive((a) => {
        const next = (a + 1) % n;
        move(next);
        return next;
      });
    }, AUTOPLAY_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.length]);

  return (
    // El número de páginas viaja al CSS: en escritorio el grid usa esa cuenta.
    <div className="deck" style={{ "--deck-n": children.length } as React.CSSProperties}>
      <div className="deck-track" ref={ref} onScroll={onScroll} style={{ height: pageH }}>
        {children.map((c, i) => (
          <div className="deck-page" key={i} aria-hidden={false}>
            {c}
          </div>
        ))}
      </div>

      <div className="deck-dots" role="tablist" aria-label="Secciones">
        {labels.map((l, i) => (
          // Punto y no etiqueta: el título ya está dentro de cada card.
          <button
            key={l}
            role="tab"
            aria-selected={i === active}
            aria-label={l}
            className={`deck-dot${i === active ? " on" : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
