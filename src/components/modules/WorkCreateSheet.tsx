"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchWorkOptions, upsertTask, upsertProject, upsertObjective } from "@/app/actions";
import { useUIStore } from "@/lib/store";
import { Sheet } from "@/components/shell/Sheet";

type Kind = "tarea" | "proyecto" | "objetivo";

/**
 * Alta de tarea, proyecto u objetivo desde el "+" principal. Vive en el
 * layout y no en la página de Trabajo: así hay un solo botón de crear en
 * toda la app en vez de uno flotando sobre el otro.
 */
export function WorkCreateSheet() {
  const open = useUIStore((s) => s.activeSheet === "work");
  const close = useUIStore((s) => s.closeSheet);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [kind, setKind] = useState<Kind>("tarea");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [objectiveId, setObjectiveId] = useState("");
  const [due, setDue] = useState("");
  const [opts, setOpts] = useState<{ projects: { id: string; name: string }[]; objectives: { id: string; title: string }[] }>({
    projects: [],
    objectives: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Las opciones se piden al abrir: no hace falta cargarlas en cada pantalla.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setProjectId("");
    setObjectiveId("");
    setError(null);
    fetchWorkOptions().then((res) => {
      if (!res.ok) return setError(res.error);
      setOpts({ projects: res.data.projects, objectives: res.data.objectives });
      setDue(res.data.today);
    });
  }, [open]);

  function create() {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res =
        kind === "tarea"
          ? await upsertTask({ title, projectId: projectId || null, dueDate: due || null })
          : kind === "proyecto"
            ? await upsertProject({ name: title, objectiveId: objectiveId || null })
            : await upsertObjective({ title });
      if (!res.ok) return setError(res.error);
      close();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={close} title="Crear" subtitle="Se guarda en Trabajo." className="task-sheet">
      <div className="tabs">
        {(["tarea", "proyecto", "objetivo"] as Kind[]).map((k) => (
          <button key={k} className={`tab${kind === k ? " active" : ""}`} onClick={() => setKind(k)}>
            {k === "tarea" ? "Tarea" : k === "proyecto" ? "Proyecto" : "Objetivo"}
          </button>
        ))}
      </div>

      <div className="ci-field">
        <div className="lab">
          <span>{kind === "tarea" ? "¿Qué hay que hacer?" : "Nombre"}</span>
        </div>
        <input className="ci-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {kind === "tarea" && (
        <>
          <div className="ci-field">
            <div className="lab">
              <span>Para cuándo</span>
            </div>
            <input className="ci-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          {opts.projects.length > 0 && (
            <div className="ci-field">
              <div className="lab">
                <span>Proyecto</span>
              </div>
              <select className="ci-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Sin proyecto</option>
                {opts.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {kind === "proyecto" && opts.objectives.length > 0 && (
        <div className="ci-field">
          <div className="lab">
            <span>Objetivo</span>
          </div>
          <select className="ci-input" value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
            <option value="">Sin objetivo</option>
            {opts.objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <button className="ci-save" onClick={create} disabled={!title.trim()}>
        Crear
      </button>
    </Sheet>
  );
}
