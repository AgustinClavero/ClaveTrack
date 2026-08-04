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
export function NotificationBell({ items }: { items: Insight[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const openSheet = useUIStore((s) => s.openSheet);
  const ref = useRef<HTMLDivElement>(null);

  // Lo visto se recuerda por día: al cambiar de día vuelven a avisar.
  const key = `ct-seen-${new Date().toISOString().slice(0, 10)}`;
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setSeen([]);
    }
  }, [key]);

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

  const unread = items.filter((i) => !seen.includes(i.id)).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items.length) {
      const ids = items.map((i) => i.id);
      setSeen(ids);
      try {
        localStorage.setItem(key, JSON.stringify(ids));
      } catch {}
    }
  }

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        className="icon-btn bell"
        onClick={toggle}
        aria-label={unread > 0 ? `${unread} avisos sin leer` : "Avisos"}
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && <span className="bell-dot">{unread}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Avisos">
          <div className="bell-head">
            <span className="eyebrow">Avisos de hoy</span>
          </div>
          {items.length === 0 ? (
            <p className="note" style={{ margin: 0 }}>
              Nada pendiente. Vas al día. 🎯
            </p>
          ) : (
            <ul className="bell-list">
              {items.map((i) => {
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
                    {i.href ? (
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
