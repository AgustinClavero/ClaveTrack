import { nf } from "@/lib/utils";
import type { Milestone, PaceReport } from "@/lib/calculations/insights";

/** Hitos del objetivo de peso + ritmo real contra el esperado. */
export function MilestoneTrack({
  milestones,
  pace,
  startKg,
  currentKg,
  targetKg,
}: {
  milestones: Milestone[];
  pace: PaceReport | null;
  startKg: number;
  currentKg: number;
  targetKg: number;
}) {
  if (milestones.length === 0) {
    return (
      <section className="card">
        <span className="eyebrow">Hitos</span>
        <p className="note">Definí tu peso objetivo en Ajustes y registrá tu peso para ver los hitos del camino.</p>
      </section>
    );
  }

  const losing = targetKg < startKg;
  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <section className="card ms-track">
      <div className="dc-head">
        <span className="eyebrow">Hitos del objetivo</span>
        <span className="dc-pct">
          {doneCount}/{milestones.length}
        </span>
      </div>

      <div className="ms-line">
        {milestones.map((m) => (
          <div key={m.id} className={`ms-node${m.done ? " done" : ""}`}>
            <span className="ms-dot" aria-hidden="true">
              {m.done ? "✓" : m.emoji}
            </span>
            <span className="ms-lab">{m.label}</span>
            {!m.done && (
              <span className="ms-bar">
                <i style={{ width: `${Math.round(m.progress * 100)}%` }} />
              </span>
            )}
          </div>
        ))}
      </div>

      {pace && (
        <div className="pace">
          <div className="pace-row">
            <span className="pace-lab">Tu ritmo</span>
            <b className={pace.perWeek === 0 ? "" : (pace.perWeek < 0) === losing ? "good" : "off"}>
              {pace.perWeek > 0 ? "+" : ""}
              {nf(pace.perWeek, 2)} kg/sem
            </b>
          </div>
          {pace.neededPerWeek != null && (
            <div className="pace-row">
              <span className="pace-lab">Necesario</span>
              <b>
                {pace.neededPerWeek > 0 ? "+" : ""}
                {nf(pace.neededPerWeek, 2)} kg/sem
              </b>
            </div>
          )}
          {pace.projectedDate && (
            <div className="pace-row">
              <span className="pace-lab">A este ritmo llegás</span>
              <b>{formatDate(pace.projectedDate)}</b>
            </div>
          )}
          <p className="note">
            {paceMessage(pace, losing, currentKg, targetKg)}
          </p>
        </div>
      )}
    </section>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso + "T12:00:00Z")
  );
}

/** Mensaje honesto: informa, no moraliza. */
function paceMessage(pace: PaceReport, losing: boolean, current: number, target: number): string {
  const remaining = Math.abs(current - target);
  if (remaining < 0.3) return "Estás en tu meta. Ahora se trata de sostenerla.";
  if (Math.abs(pace.perWeek) < 0.05) return "Tu peso está estable. Si buscás moverlo, revisá tus calorías en Ajustes.";
  const goingRight = (pace.perWeek < 0) === losing;
  if (!goingRight) return `Vas en sentido contrario a tu meta. Un par de semanas dicen poco: mirá la tendencia antes de cambiar el plan.`;
  if (pace.onTrack === false) return `Vas en la dirección correcta pero más lento de lo previsto para la fecha objetivo.`;
  return `Vas en camino: te faltan ${nf(remaining, 1)} kg.`;
}
