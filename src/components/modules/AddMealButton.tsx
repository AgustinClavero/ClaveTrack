"use client";

import { Plus } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function AddMealButton({
  variant = "ghost",
  label = "Agregar",
}: {
  variant?: "ghost" | "solid";
  label?: string;
}) {
  const openSheet = useUIStore((s) => s.openSheet);
  return (
    <button className={variant === "solid" ? "btn-dark-sm" : "head-action"} onClick={() => openSheet("meal")}>
      <Plus size={16} strokeWidth={2.5} />
      <span>{label}</span>
    </button>
  );
}
