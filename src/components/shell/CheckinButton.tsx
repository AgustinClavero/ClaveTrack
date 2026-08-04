"use client";

import { CalendarCheck } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function CheckinButton() {
  const openCheckin = useUIStore((s) => s.openCheckin);
  return (
    <button className="icon-btn" onClick={openCheckin} aria-label="Check-in de hoy">
      <CalendarCheck size={16} />
    </button>
  );
}
