"use client";

import { Scale } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function AddWeightButton({
  variant = "ghost",
  label = "Registrar peso",
}: {
  variant?: "ghost" | "solid";
  label?: string;
}) {
  const openSheet = useUIStore((s) => s.openSheet);
  return (
    <button className={variant === "solid" ? "btn-dark-sm" : "head-action"} onClick={() => openSheet("weight")}>
      <Scale size={16} />
      <span>{label}</span>
    </button>
  );
}
