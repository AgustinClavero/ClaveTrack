"use client";

import { create } from "zustand";

interface UIState {
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  checkinOpen: boolean;
  openCheckin: () => void;
  closeCheckin: () => void;
}

/** Estado local efímero de la UI (Zustand). */
export const useUIStore = create<UIState>((set) => ({
  sheetOpen: false,
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
  checkinOpen: false,
  openCheckin: () => set({ checkinOpen: true }),
  closeCheckin: () => set({ checkinOpen: false }),
}));
