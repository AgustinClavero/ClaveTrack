"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Trash2, X } from "lucide-react";
import {
  upsertTask,
  setTaskStatus,
  deleteTask,
  upsertTaskItem,
  toggleTaskItem,
  deleteTaskItem,
} from "@/app/actions";
import { PRIORITY_LABEL, PRIORITY_RANK, TASK_STATUS_LABEL, dueLabel, type TaskStatus } from "@/lib/calculations/work";
import type { WorkData, Task } from "@/lib/data/queries";
import { Sheet } from "@/components/shell/Sheet";
import { Pomodoro } from "./Pomodoro";

type View = "hoy" | "lista" | "tablero" | "objetivos";
const COLUMNS: TaskStatus[] = ["pendiente", "haciendo", "hecha"];

/**
 * Módulo Trabajo. Cuatro vistas sobre los mismos datos:
 * hoy (lo que vence), lista por proyecto, tablero por estado y objetivos.
 */
export function WorkBoard({ data }: { data: WorkData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<View>("hoy");
  const [open, setOpen] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { today, tasks, projects, objectives } = data;
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const delDia = tasks
    .filter((t) => t.dueDate != null && t.dueDate <= today && t.status !== "hecha")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const hechasHoy = tasks.filter((t) => t.dueDate != null && t.dueDate <= today && t.status === "hecha");

  function move(t: Task, status: TaskStatus) {
    setError(null);
    startTransition(async () => {
      const res = await setTaskStatus({ taskId: t.id, status });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="work-tabs" role="tablist">
        {(["hoy", "lista", "tablero", "objetivos"] as View[]).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} className={`tab${view === v ? " active" : ""}`} onClick={() => setView(v)}>
            {v === "hoy" ? "Hoy" : v === "lista" ? "Lista" : v === "tablero" ? "Tablero" : "Objetivos"}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {view === "hoy" && (
        <div className="stack">
          <Pomodoro tasks={delDia} minutesToday={data.pomodoroToday} />

          <section className="card">
            <div className="dc-head">
              <span className="eyebrow">Para hoy</span>
              <span className="dc-pct">
                {hechasHoy.length}/{hechasHoy.length + delDia.length}
              </span>
            </div>
            {delDia.length === 0 ? (
              <div className="empty-mini">
                {hechasHoy.length > 0 ? "Todo cerrado por hoy. 🎯" : "No hay nada agendado para hoy."}
              </div>
            ) : (
              <ul className="task-list">
                {delDia.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} project={projectById.get(t.projectId ?? "")} onOpen={() => setOpen(t)} onDone={() => move(t, "hecha")} />
                ))}
              </ul>
            )}
          </section>

          {hechasHoy.length > 0 && (
            <section className="card">
              <span className="eyebrow">Cerradas</span>
              <ul className="task-list done">
                {hechasHoy.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} project={projectById.get(t.projectId ?? "")} onOpen={() => setOpen(t)} onDone={() => move(t, "pendiente")} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {view === "lista" && (
        <div className="stack">
          {projects.map((p) => {
            const mine = tasks.filter((t) => t.projectId === p.id);
            return (
              <section className="card" key={p.id}>
                <div className="dc-head">
                  <span className="eyebrow">
                    {p.emoji} {p.name}
                  </span>
                  <span className="dc-pct">{p.progress}%</span>
                </div>
                <div className="lv-bar">
                  <i style={{ width: `${p.progress}%` }} />
                </div>
                {mine.length === 0 ? (
                  <div className="empty-mini">Sin tareas todavía.</div>
                ) : (
                  <ul className="task-list">
                    {mine.map((t) => (
                      <TaskRow key={t.id} task={t} today={today} onOpen={() => setOpen(t)} onDone={() => move(t, t.status === "hecha" ? "pendiente" : "hecha")} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {(() => {
            const sueltas = tasks.filter((t) => !t.projectId);
            if (sueltas.length === 0) return null;
            return (
              <section className="card">
                <span className="eyebrow">Sin proyecto</span>
                <ul className="task-list">
                  {sueltas.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} onOpen={() => setOpen(t)} onDone={() => move(t, t.status === "hecha" ? "pendiente" : "hecha")} />
                  ))}
                </ul>
              </section>
            );
          })()}

          {projects.length === 0 && tasks.length === 0 && (
            <div className="card empty-card">
              <p>Todavía no tenés proyectos ni tareas. Empezá creando el primero.</p>
            </div>
          )}
        </div>
      )}

      {view === "tablero" && (
        <div className="kanban">
          {COLUMNS.map((col) => {
            const mine = tasks.filter((t) => t.status === col);
            return (
              <section className="kan-col" key={col}>
                <header className="kan-head">
                  <span className="eyebrow">{TASK_STATUS_LABEL[col]}</span>
                  <span className="kan-n">{mine.length}</span>
                </header>
                <div className="kan-cards">
                  {mine.map((t) => (
                    <article className="kan-card" key={t.id}>
                      <button className="kc-title" onClick={() => setOpen(t)}>
                        {t.title}
                      </button>
                      <div className="kc-meta">
                        <span className={`prio ${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span>
                        {t.items.length > 0 && (
                          <span className="kc-items">
                            {t.items.filter((i) => i.done).length}/{t.items.length}
                          </span>
                        )}
                      </div>
                      {/* Sin arrastre: en móvil los botones son más certeros que el drag. */}
                      <div className="kc-move">
                        {COLUMNS.filter((c) => c !== col).map((c) => (
                          <button key={c} onClick={() => move(t, c)}>
                            {TASK_STATUS_LABEL[c]}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                  {mine.length === 0 && <p className="kan-empty">Vacío</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {view === "objetivos" && (
        <div className="stack">
          {objectives.length === 0 && (
            <div className="card empty-card">
              <p>Los objetivos agrupan proyectos. Creá uno para ver el avance del conjunto.</p>
            </div>
          )}
          {objectives.map((o) => (
            <section className="card" key={o.id}>
              <div className="dc-head">
                <span className="eyebrow">
                  {o.emoji} {o.title}
                </span>
                <span className="dc-pct">{o.progress}%</span>
              </div>
              <div className="lv-bar">
                <i style={{ width: `${o.progress}%` }} />
              </div>
              {o.description && <p className="note">{o.description}</p>}
              <ul className="obj-projects">
                {projects
                  .filter((p) => p.objectiveId === o.id)
                  .map((p) => (
                    <li key={p.id}>
                      <span>
                        {p.emoji} {p.name}
                      </span>
                      <b>{p.progress}%</b>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* El alta vive en el "+" principal: un solo botón de crear en la app. */}
      {open && <TaskSheet task={open} projects={projects} today={today} onClose={() => setOpen(null)} />}
    </>
  );
}

// ---------- Fila de tarea ----------

function TaskRow({
  task,
  today,
  project,
  onOpen,
  onDone,
}: {
  task: Task;
  today: string;
  project?: { name: string; emoji: string | null };
  onOpen: () => void;
  onDone: () => void;
}) {
  const due = dueLabel(task.dueDate, today);
  const hechos = task.items.filter((i) => i.done).length;

  return (
    <li className={task.status === "hecha" ? "done" : ""}>
      <button className="tk-check" onClick={onDone} aria-label={task.status === "hecha" ? "Reabrir" : "Marcar hecha"}>
        {task.status === "hecha" ? <Check size={14} strokeWidth={3} /> : <Circle size={14} />}
      </button>
      <button className="tk-body" onClick={onOpen}>
        <span className="tk-t">{task.title}</span>
        <span className="tk-meta">
          {project && (
            <em>
              {project.emoji} {project.name}
            </em>
          )}
          {task.items.length > 0 && (
            <em>
              ☑ {hechos}/{task.items.length}
            </em>
          )}
          {due && <em className={due.late ? "late" : ""}>{due.text}</em>}
        </span>
      </button>
      <span className={`prio ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
    </li>
  );
}

// ---------- Detalle de tarea ----------

function TaskSheet({
  task,
  projects,
  today,
  onClose,
}: {
  task: Task;
  projects: WorkData["projects"];
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const [due, setDue] = useState(task.dueDate ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [items, setItems] = useState(task.items);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await upsertTask({
        id: task.id,
        title,
        description: desc || null,
        dueDate: due || null,
        priority,
        projectId: projectId || null,
        status: task.status,
      });
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  function addItem() {
    const t = nuevo.trim();
    if (!t) return;
    setNuevo("");
    startTransition(async () => {
      const res = await upsertTaskItem({ taskId: task.id, title: t });
      if (!res.ok) return setError(res.error);
      setItems((xs) => [...xs, { id: res.data.id, title: t, done: false }]);
      router.refresh();
    });
  }

  function toggle(id: string, done: boolean) {
    setItems((xs) => xs.map((i) => (i.id === id ? { ...i, done } : i)));
    startTransition(async () => {
      const res = await toggleTaskItem({ itemId: id, done });
      if (!res.ok) {
        setItems((xs) => xs.map((i) => (i.id === id ? { ...i, done: !done } : i)));
        setError(res.error);
      } else router.refresh();
    });
  }

  function removeItem(id: string) {
    setItems((xs) => xs.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteTaskItem({ itemId: id });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteTask({ taskId: task.id });
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  const hechos = items.filter((i) => i.done).length;

  return (
    <Sheet open onClose={onClose} title="Tarea" className="task-sheet">
      <div className="ci-field">
        <div className="lab">
          <span>Título</span>
        </div>
        <input className="ci-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="ci-field">
        <div className="lab">
          <span>Descripción</span>
        </div>
        <textarea className="ci-input ci-area" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Notas, contexto, enlaces…" />
      </div>

      <div className="ci-row">
        <div className="ci-field">
          <div className="lab">
            <span>Para cuándo</span>
          </div>
          <input className="ci-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="ci-field">
          <div className="lab">
            <span>Prioridad</span>
          </div>
          <select className="ci-input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      <div className="ci-field">
        <div className="lab">
          <span>Proyecto</span>
        </div>
        <select className="ci-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="ci-field">
        <div className="lab">
          <span>Checklist</span>
          {items.length > 0 && (
            <span className="val">
              {hechos}/{items.length}
            </span>
          )}
        </div>
        <ul className="check-list">
          {items.map((i) => (
            <li key={i.id} className={i.done ? "done" : ""}>
              <button className="tk-check" onClick={() => toggle(i.id, !i.done)} aria-label={`Marcar ${i.title}`}>
                {i.done ? <Check size={13} strokeWidth={3} /> : <Circle size={13} />}
              </button>
              <span>{i.title}</span>
              <button className="ci-del" onClick={() => removeItem(i.id)} aria-label={`Borrar ${i.title}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="water-exact">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Agregar paso"
            aria-label="Nuevo paso del checklist"
          />
          <button onClick={addItem} disabled={!nuevo.trim()}>
            Sumar
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="ci-save" onClick={save}>
        Guardar
      </button>
      <button className="task-del" onClick={remove}>
        <Trash2 size={15} /> Borrar tarea
      </button>
    </Sheet>
  );
}
