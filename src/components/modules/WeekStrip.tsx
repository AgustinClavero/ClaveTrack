const DAYS = [
  { dn: "Dom", n: 3, state: "done" },
  { dn: "Lun", n: 4, state: "today" },
  { dn: "Mar", n: 5, state: "future" },
  { dn: "Mié", n: 6, state: "future" },
  { dn: "Jue", n: 7, state: "future" },
  { dn: "Vie", n: 8, state: "future" },
  { dn: "Sáb", n: 9, state: "future" },
];

/** Selector de días de la semana con estado (mock). */
export function WeekStrip() {
  return (
    <div className="week">
      {DAYS.map((d) => (
        <div key={d.dn} className={`day ${d.state}`}>
          <div className="dn">{d.dn}</div>
          <div className="dc">{d.n}</div>
        </div>
      ))}
    </div>
  );
}
