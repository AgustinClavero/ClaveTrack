import type { Achievement } from "@/lib/calculations/insights";

/** Logros: los desbloqueados se ven plenos, los pendientes con su progreso. */
export function AchievementGrid({ items }: { items: Achievement[] }) {
  const unlocked = items.filter((a) => a.unlocked).length;

  return (
    <section className="card ach-card">
      <div className="dc-head">
        <span className="eyebrow">Logros</span>
        <span className="dc-pct">
          {unlocked}/{items.length}
        </span>
      </div>
      <div className="ach-grid">
        {items.map((a) => (
          <div key={a.id} className={`ach${a.unlocked ? " on" : ""}`} title={a.hint}>
            <span className="ach-emoji" aria-hidden="true">
              {a.emoji}
            </span>
            <span className="ach-name">{a.name}</span>
            {a.unlocked ? (
              <span className="ach-state">Conseguido</span>
            ) : (
              <span className="ach-bar">
                <i style={{ width: `${Math.round(a.progress * 100)}%` }} />
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
