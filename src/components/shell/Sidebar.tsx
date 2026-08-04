"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_MAIN, NAV_SOON } from "./nav-items";
import { useUIStore } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const openSheet = useUIStore((s) => s.openSheet);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>
      {NAV_MAIN.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`side-link${pathname === n.href ? " active" : ""}`}
        >
          <span className="ic">
            <n.Icon size={19} strokeWidth={2} />
          </span>
          {n.label}
        </Link>
      ))}
      {NAV_SOON.map((n) => (
        <button key={n.label} className="side-link" onClick={() => alert("Sección de fases siguientes.")}>
          <span className="ic">
            <n.Icon size={19} strokeWidth={2} />
          </span>
          {n.label}
        </button>
      ))}
      <div className="side-cta">
        <button className="btn-dark" onClick={openSheet}>
          <Plus size={18} strokeWidth={2.5} />
          Registrar
        </button>
      </div>
    </aside>
  );
}
