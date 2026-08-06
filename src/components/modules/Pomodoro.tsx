"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RotateCcw } from "lucide-react";
import { logPomodoro } from "@/app/actions";
import { Ring } from "@/components/ui/Ring";
import type { Task } from "@/lib/data/queries";

const FOCO_MIN = 25;
const PAUSA_MIN = 5;

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Pomodoro. El reloj corre en el cliente y solo se guarda la sesión terminada:
 * no tiene sentido mantener un temporizador en el servidor para esto.
 */
export function Pomodoro({ tasks, minutesToday }: { tasks: Task[]; minutesToday: number }) {
  const router = useRouter();
  const [kind, setKind] = useState<"foco" | "pausa">("foco");
  const [left, setLeft] = useState(FOCO_MIN * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState("");
  const doneRef = useRef(false);

  const total = (kind === "foco" ? FOCO_MIN : PAUSA_MIN) * 60;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Al llegar a cero se registra una sola vez y se pasa al otro modo.
  useEffect(() => {
    if (left > 0 || doneRef.current) return;
    doneRef.current = true;
    setRunning(false);

    const min = kind === "foco" ? FOCO_MIN : PAUSA_MIN;
    logPomodoro({ minutes: min, kind, taskId: taskId || null }).then(() => router.refresh());

    const next = kind === "foco" ? "pausa" : "foco";
    setKind(next);
    setLeft((next === "foco" ? FOCO_MIN : PAUSA_MIN) * 60);
    doneRef.current = false;
  }, [left, kind, taskId, router]);

  function reset() {
    setRunning(false);
    setLeft(total);
  }

  function switchTo(k: "foco" | "pausa") {
    setKind(k);
    setRunning(false);
    setLeft((k === "foco" ? FOCO_MIN : PAUSA_MIN) * 60);
  }

  return (
    <section className="card pomo">
      <div className="pomo-ring">
        <Ring
          size={132}
          stroke={12}
          value={(total - left) / total}
          color={kind === "foco" ? "var(--ink)" : "var(--green)"}
          track="var(--surface-2)"
          centerFontSize={30}
        >
          <b>{mmss(left)}</b>
        </Ring>
      </div>

      <div className="pomo-side">
        <div className="tabs pomo-tabs">
          <button className={`tab${kind === "foco" ? " active" : ""}`} onClick={() => switchTo("foco")}>
            Foco
          </button>
          <button className={`tab${kind === "pausa" ? " active" : ""}`} onClick={() => switchTo("pausa")}>
            Pausa
          </button>
        </div>

        {tasks.length > 0 && (
          <select className="ci-input pomo-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Sin tarea asociada</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}

        <div className="pomo-actions">
          <button className="btn-dark" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pausar" : "Empezar"}
          </button>
          <button className="icon-btn" onClick={reset} aria-label="Reiniciar">
            <RotateCcw size={16} />
          </button>
        </div>

        <p className="pomo-total">{minutesToday} min de foco hoy</p>
      </div>
    </section>
  );
}
