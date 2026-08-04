"use client";

import { CalendarCheck } from "lucide-react";
import { useUIStore } from "@/lib/store";

/** Abre el check-in del día. `wide` es la variante del sidebar (desktop). */
export function CheckinButton({ variant = "icon", done = false }: { variant?: "icon" | "wide"; done?: boolean }) {
  const openSheet = useUIStore((s) => s.openSheet);

  if (variant === "wide") {
    return (
      <button className="side-tool" onClick={() => openSheet("checkin")}>
        <CalendarCheck size={17} />
        <span>{done ? "Ver check-in" : "Check-in"}</span>
      </button>
    );
  }

  return (
    <button className="icon-btn" onClick={() => openSheet("checkin")} aria-label="Check-in de hoy">
      <CalendarCheck size={16} />
    </button>
  );
}
