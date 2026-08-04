"use server";

import { buildDayDetails, type DayDetail } from "@/lib/data/queries";
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
