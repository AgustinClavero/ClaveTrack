"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useUIStore } from "@/lib/store";
import type { Insight } from "@/lib/calculations/insights";

/**
 * Campanita del header: junta las recomendaciones del día y los logros
 * recién desbloqueados. El punto se apaga cuando se abre el panel.
 */
const SUMMARY_KEY = "ct-summary-read";

export function NotificationBell({ items }: { items: Insight[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  /** Resúmenes ya abiertos: el aviso no vuelve a aparecer. */
  const [readSummaries, setReadSummaries] = useState<string[]>([]);
  const openSheet = useUIStore((s) => s.openSheet);
  const openSummary = useUIStore((s) => s.openSummary);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Lo visto se recuerda por día: al cambiar de día vuelven a avisar.
  const key = `ct-seen-${new Date().toISOString().slice(0, 10)}`;
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setSeen([]);
    }
    try {
      setReadSummaries(JSON.parse(localStorage.getItem(SUMMARY_KEY) ?? "[]"));
    } catch {
      setReadSummaries([]);
    }
  }, [key]);

  /** El aviso de resumen se descarta al abrirlo: ya cumplió su función. */
  function markSummaryRead(date: string) {
    const next = [...new Set([...readSummaries, date])].slice(-30);
    setReadSummaries(next);
    try {
      localStorage.setItem(SUMMARY_KEY, JSON.stringify(next));
    } catch {}
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // El panel se posiciona contra la pantalla, no contra la campana: en móvil
  // la campana está pegada al borde y un panel anclado a ella se sale de cuadro.
  useEffect(() => {
    if (!open) return;
    function place() {
      const btn = btnRef.current;
      const panel = panelRef.current;
      if (!btn || !panel) return;
      const b = btn.getBoundingClientRect();
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      const margin = 12;

      // Alineado al borde derecho de la campana, sin pasarse de la pantalla.
      const left = Math.max(margin, Math.min(b.right - w, window.innerWidth - w - margin));
      // Debajo; si no entra (sidebar de escritorio), arriba.
      const below = b.bottom + 8;
      const raw = below + h > window.innerHeight - margin ? b.top - h - 8 : below;
      // Clamp final: el header no es fijo, así que la campana puede quedar
      // fuera de cuadro y el panel se iría con ella.
      const top = Math.min(Math.max(margin, raw), Math.max(margin, window.innerHeight - h - margin));
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) setPos(null);
  }, [open]);

  const visible = items.filter((i) => !i.summaryDate || !readSummaries.includes(i.summaryDate));
  const unread = visible.filter((i) => !seen.includes(i.id)).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && visible.length) {
      const ids = visible.map((i) => i.id);
      setSeen(ids);
      try {
        localStorage.setItem(key, JSON.stringify(ids));
      } catch {}
    }
  }

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        ref={btnRef}
        className="icon-btn bell"
        onClick={toggle}
        aria-label={unread > 0 ? `${unread} avisos sin leer` : "Avisos"}
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && <span className="bell-dot">{unread}</span>}
      </button>

      {/* Oscurece el resto: el panel flota sobre la pantalla y sin esto
          se confunde con el contenido de atrás. */}
      {open && <div className="overlay show bell-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}

      {open && (
        <div
          ref={panelRef}
          className="bell-panel"
          role="dialog"
          aria-label="Avisos"
          style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
        >
          <div className="bell-head">
            <span className="eyebrow">Avisos de hoy</span>
          </div>
          {visible.length === 0 ? (
            <p className="note" style={{ margin: 0 }}>
              Nada pendiente. Vas al día. 🎯
            </p>
          ) : (
            <ul className="bell-list">
              {visible.map((i) => {
                const body = (
                  <>
                    <span className={`ins-icon ${i.tone}`} aria-hidden="true">
                      {i.emoji}
                    </span>
                    <span className="ins-text">
                      <span className="t">{i.title}</span>
                      <span className="d">{i.detail}</span>
                    </span>
                  </>
                );
                return (
                  <li key={i.id}>
                    {i.summaryDate ? (
                      <button
                        className="bell-item"
                        onClick={() => {
                          setOpen(false);
                          markSummaryRead(i.summaryDate!);
                          openSummary(i.summaryDate!);
                        }}
                      >
                        {body}
                      </button>
                    ) : i.href ? (
                      <Link href={i.href} className="bell-item" onClick={() => setOpen(false)}>
                        {body}
                      </Link>
                    ) : i.cta ? (
                      <button
                        className="bell-item"
                        onClick={() => {
                          setOpen(false);
                          openSheet("checkin");
                        }}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="bell-item static">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
