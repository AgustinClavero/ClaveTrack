"use client";

import { Pencil } from "lucide-react";
import { useUIStore } from "@/lib/store";

/** Foco del día: clickeable, abre el check-in para definirlo o cambiarlo. */
export function FocusEditor({ focus }: { focus: string | null }) {
  const openSheet = useUIStore((s) => s.openSheet);
  return (
    <button className="foc" onClick={() => openSheet("checkin")}>
      <span className="foc-lab">Foco de hoy:</span>
      <b>{focus || "definilo en el check-in"}</b>
      <Pencil size={13} />
    </button>
  );
}
