"use client";

import { create } from "zustand";

/** Hojas/modales de la app. Solo puede haber una abierta a la vez. */
export type SheetId = "register" | "checkin" | "meal" | "weight";

interface UIState {
  activeSheet: SheetId | null;
  openSheet: (id: SheetId) => void;
  closeSheet: () => void;
}

/** Estado local efímero de la UI (Zustand). Nada de datos de servidor acá. */
export const useUIStore = create<UIState>((set) => ({
  activeSheet: null,
  openSheet: (id) => set({ activeSheet: id }),
  closeSheet: () => set({ activeSheet: null }),
}));
