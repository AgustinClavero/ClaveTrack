"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_FULL, NAV_SECONDARY } from "./nav-items";
import { useUIStore } from "@/lib/store";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { CheckinButton } from "./CheckinButton";
import { NotificationBell } from "./NotificationBell";
import type { Insight } from "@/lib/calculations/insights";

export function Sidebar({ streak, alerts }: { streak: number; alerts: Insight[] }) {
  const pathname = usePathname();
  const openSheet = useUIStore((s) => s.openSheet);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>

      <nav className="side-nav">
        {NAV_FULL.map((n) => (
          <Link key={n.href} href={n.href} className={`side-link${pathname === n.href ? " active" : ""}`}>
            <span className="ic">
              <n.Icon size={19} strokeWidth={2} />
            </span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="side-cta">
        <button className="btn-dark" onClick={() => openSheet("register")}>
          <Plus size={18} strokeWidth={2.5} />
          Registrar
        </button>
      </div>

      <div className="side-foot">
        <div className="side-streak">
          <span className="streak-pill">🔥 {streak}</span>
          <span className="ss-lab">racha de días</span>
          <NotificationBell items={alerts} />
        </div>
        {NAV_SECONDARY.map((n) => (
          <Link key={n.href} href={n.href} className={`side-link${pathname === n.href ? " active" : ""}`}>
            <span className="ic">
              <n.Icon size={19} strokeWidth={2} />
            </span>
            {n.label}
          </Link>
        ))}
        <div className="side-tools">
          <CheckinButton variant="wide" />
          <ThemeToggle />
        </div>
        <LogoutButton variant="side" />
      </div>
    </aside>
  );
}
