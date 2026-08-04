/** Fecha del día que se está viendo, en la timezone del usuario. */
export function PageDate({ date, timezone }: { date: string; timezone?: string }) {
  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone ?? "UTC",
  }).format(new Date(date + "T12:00:00Z"));

  return <p className="page-date">{label.charAt(0).toUpperCase() + label.slice(1)}</p>;
}
