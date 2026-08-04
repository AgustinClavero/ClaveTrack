"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useUIStore } from "@/lib/store";
import type { Insight } from "@/lib/calculations/insights";

/** Recomendaciones accionables del día. Cada una lleva a donde se resuelve. */
export function InsightList({ items }: { items: Insight[] }) {
  const openSheet = useUIStore((s) => s.openSheet);
  if (items.length === 0) return null;

  return (
    <section className="card insights">
      <span className="eyebrow">Para hoy</span>
      <div className="ins-list">
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
              {(i.href || i.cta) && <ChevronRight size={16} className="ins-arrow" />}
            </>
          );

          if (i.href) {
            return (
              <Link key={i.id} href={i.href} className="ins-row">
                {body}
              </Link>
            );
          }
          if (i.cta) {
            return (
              <button key={i.id} className="ins-row" onClick={() => openSheet("checkin")}>
                {body}
              </button>
            );
          }
          return (
            <div key={i.id} className="ins-row static">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
