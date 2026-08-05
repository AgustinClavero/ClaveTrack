"use server";

import { buildDayDetails, getDaySummary, type DayDetail, type DaySummaryPayload } from "@/lib/data/queries";
import { getUserContext } from "@/lib/data/context";
import { monthGrid } from "@/lib/date";
import type { ActionResult } from "@/types";

/** Detalle de todos los días de un mes ("YYYY-MM") para el calendario. */
export async function fetchMonthDetail(month: string): Promise<ActionResult<DayDetail[]>> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Mes inválido." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };

  const grid = monthGrid(month, ctx.timezone);
  const days = await buildDayDetails(grid[0].date, grid[grid.length - 1].date);
  return { ok: true, data: days };
}

/** Resumen de un día concreto para el modal. */
export async function fetchDaySummary(date: string): Promise<ActionResult<DaySummaryPayload>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Fecha inválida." };
  const data = await getDaySummary(date);
  if (!data) return { ok: false, error: "No hay datos de ese día." };
  return { ok: true, data };
}

/** Detalle de un día suelto, para abrirlo desde la tira de Inicio. */
export async function fetchDayDetail(
  date: string
): Promise<ActionResult<{ day: DayDetail; threshold: number; today: string }>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Fecha inválida." };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "Sesión expirada." };
  const [day] = await buildDayDetails(date, date);
  if (!day) return { ok: false, error: "No hay datos de ese día." };
  return { ok: true, data: { day, threshold: ctx.streakThreshold, today: ctx.today } };
}
