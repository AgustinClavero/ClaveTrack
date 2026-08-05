"use client";

import { create } from "zustand";

/** Hojas/modales de la app. Solo puede haber una abierta a la vez. */
export type SheetId = "register" | "checkin" | "meal" | "weight" | "workout" | "routine" | "nutrition" | "summary" | "dayDetail";

interface UIState {
  activeSheet: SheetId | null;
  /** Día que muestra el resumen. Null = el que resuelva el servidor. */
  summaryDate: string | null;
  /** Día que muestra el detalle. */
  dayDetailDate: string | null;
  openSheet: (id: SheetId) => void;
  /** Abre el resumen de una fecha concreta. */
  openSummary: (date: string) => void;
  /** Abre el detalle de una fecha concreta. */
  openDayDetail: (date: string) => void;
  closeSheet: () => void;
}

/** Estado local efímero de la UI (Zustand). Nada de datos de servidor acá. */
export const useUIStore = create<UIState>((set) => ({
  activeSheet: null,
  summaryDate: null,
  dayDetailDate: null,
  openSheet: (id) => set({ activeSheet: id }),
  openSummary: (date) => set({ activeSheet: "summary", summaryDate: date }),
  openDayDetail: (date) => set({ activeSheet: "dayDetail", dayDetailDate: date }),
  closeSheet: () => set({ activeSheet: null }),
}));
