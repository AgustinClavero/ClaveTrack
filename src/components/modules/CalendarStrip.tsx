import { Ring } from "@/components/ui/Ring";
import type { CalendarDay } from "@/lib/data/queries";

export function CalendarStrip({ days }: { days: CalendarDay[] }) {
  return (
    <div className="cal7">
      {days.map((d) => (
        <button key={d.date} className={`cday${d.isToday ? " today" : ""}`}>
          <div className="cdn">{d.weekday}</div>
          <div className="cdr">
            <Ring
              size={44}
              stroke={4}
              value={d.score != null ? d.score / 100 : 0}
              color={d.isToday ? "var(--ink)" : "var(--muted)"}
              track="var(--surface-2)"
            >
              <span className="cdnum">{d.dayNum}</span>
            </Ring>
          </div>
        </button>
      ))}
    </div>
  );
}
