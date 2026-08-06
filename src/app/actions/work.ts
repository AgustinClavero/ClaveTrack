"use server";

import { revalidatePath } from "next/cache";
import { getServerClient, getUserContext, resolveDay } from "@/lib/data/context";
import { materializeDayScore } from "@/lib/data/score";
import { objectiveSchema, projectSchema, taskSchema, taskItemSchema, pomodoroSchema, uuid } from "@/lib/validations";
import type { ActionResult } from "@/types";

function revalidateWork() {
  revalidatePath("/work");
  revalidatePath("/today");
  revalidatePath("/progress");
}

// ---------- Objetivos ----------

export async function upsertObjective(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = objectiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del objetivo." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const row = {
    user_id: ctx.userId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    emoji: parsed.data.emoji || null,
    target_date: parsed.data.targetDate ?? null,
    status: parsed.data.status ?? "activo",
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("objectives").update(row).eq("id", parsed.data.id).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo actualizar el objetivo." };
    revalidateWork();
    return { ok: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("objectives").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo crear el objetivo." };
  revalidateWork();
  return { ok: true, data: { id: data.id } };
}

// ---------- Proyectos ----------

export async function upsertProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del proyecto." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();

  // El objetivo tiene que ser del usuario: nunca confiar en el id del cliente.
  if (parsed.data.objectiveId) {
    const { data: own } = await supabase
      .from("objectives")
      .select("id")
      .eq("id", parsed.data.objectiveId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!own) return { ok: false, error: "Ese objetivo no existe." };
  }

  const row = {
    user_id: ctx.userId,
    objective_id: parsed.data.objectiveId ?? null,
    name: parsed.data.name,
    emoji: parsed.data.emoji || null,
    color: parsed.data.color ?? null,
    status: parsed.data.status ?? "activo",
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("projects").update(row).eq("id", parsed.data.id).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo actualizar el proyecto." };
    revalidateWork();
    return { ok: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("projects").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo crear el proyecto." };
  revalidateWork();
  return { ok: true, data: { id: data.id } };
}

// ---------- Tareas ----------

export async function upsertTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos de la tarea." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  if (parsed.data.projectId) {
    const { data: own } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!own) return { ok: false, error: "Ese proyecto no existe." };
  }

  const status = parsed.data.status ?? "pendiente";
  const row = {
    user_id: ctx.userId,
    project_id: parsed.data.projectId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status,
    priority: parsed.data.priority ?? "media",
    due_date: parsed.data.dueDate ?? null,
    estimate_min: parsed.data.estimateMin ?? null,
    // El cierre lo sella el servidor: la hora del cliente no es confiable.
    done_at: status === "hecha" ? new Date().toISOString() : null,
  };

  const id = parsed.data.id;
  if (id) {
    const { error } = await supabase.from("tasks").update(row).eq("id", id).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo actualizar la tarea." };
  } else {
    const { data, error } = await supabase.from("tasks").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: "No se pudo crear la tarea." };
    await afterTaskChange(ctx.userId, row.due_date, ctx.today);
    revalidateWork();
    return { ok: true, data: { id: data.id } };
  }

  await afterTaskChange(ctx.userId, row.due_date, ctx.today);
  revalidateWork();
  return { ok: true, data: { id } };
}

/** Cambiar el estado desde la lista o el tablero, sin abrir la tarea. */
export async function setTaskStatus(input: { taskId: string; status: "pendiente" | "haciendo" | "hecha" }): Promise<ActionResult> {
  const id = uuid.safeParse(input?.taskId);
  if (!id.success || !["pendiente", "haciendo", "hecha"].includes(input?.status))
    return { ok: false, error: "Datos inválidos." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, due_date")
    .eq("id", id.data)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!task) return { ok: false, error: "Esa tarea no existe." };

  const { error } = await supabase
    .from("tasks")
    .update({ status: input.status, done_at: input.status === "hecha" ? new Date().toISOString() : null })
    .eq("id", id.data)
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo guardar." };

  await afterTaskChange(ctx.userId, task.due_date, ctx.today);
  revalidateWork();
  return { ok: true, data: undefined };
}

export async function deleteTask(input: { taskId: string }): Promise<ActionResult> {
  const id = uuid.safeParse(input?.taskId);
  if (!id.success) return { ok: false, error: "Tarea inválida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id.data).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo borrar la tarea." };

  await materializeDayScore(supabase, ctx.userId, ctx.today);
  revalidateWork();
  return { ok: true, data: undefined };
}

/** El score del día solo cambia si la tarea era de hoy o estaba vencida. */
async function afterTaskChange(userId: string, dueDate: string | null, today: string) {
  if (!dueDate || dueDate > today) return;
  await materializeDayScore(getServerClient(), userId, today);
}

// ---------- Checklist ----------

export async function upsertTaskItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = taskItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá el ítem." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", parsed.data.taskId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!task) return { ok: false, error: "Esa tarea no existe." };

  const row = {
    user_id: ctx.userId,
    task_id: parsed.data.taskId,
    title: parsed.data.title,
    done: parsed.data.done ?? false,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("task_items").update(row).eq("id", parsed.data.id).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: "No se pudo guardar el ítem." };
    revalidateWork();
    return { ok: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("task_items").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo crear el ítem." };
  revalidateWork();
  return { ok: true, data: { id: data.id } };
}

export async function toggleTaskItem(input: { itemId: string; done: boolean }): Promise<ActionResult> {
  const id = uuid.safeParse(input?.itemId);
  if (!id.success) return { ok: false, error: "Ítem inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase
    .from("task_items")
    .update({ done: !!input.done })
    .eq("id", id.data)
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidateWork();
  return { ok: true, data: undefined };
}

export async function deleteTaskItem(input: { itemId: string }): Promise<ActionResult> {
  const id = uuid.safeParse(input?.itemId);
  if (!id.success) return { ok: false, error: "Ítem inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const supabase = getServerClient();
  const { error } = await supabase.from("task_items").delete().eq("id", id.data).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "No se pudo borrar el ítem." };
  revalidateWork();
  return { ok: true, data: undefined };
}

// ---------- Pomodoro ----------

/** Registra una sesión terminada. El reloj corre en el cliente; acá solo se guarda. */
export async function logPomodoro(input: unknown): Promise<ActionResult> {
  const parsed = pomodoroSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sesión inválida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const { date } = resolveDay(ctx.today, parsed.data.date);

  const supabase = getServerClient();
  const { error } = await supabase.from("pomodoro_sessions").insert({
    user_id: ctx.userId,
    task_id: parsed.data.taskId ?? null,
    log_date: date,
    minutes: parsed.data.minutes,
    kind: parsed.data.kind ?? "foco",
  });
  if (error) return { ok: false, error: "No se pudo registrar la sesión." };

  revalidateWork();
  return { ok: true, data: undefined };
}
