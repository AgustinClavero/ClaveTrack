"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_MAIN, withDay } from "./nav-items";
import { useActiveDay } from "@/lib/hooks/use-active-day";
import { useUIStore } from "@/lib/store";

export function BottomNav() {
  const pathname = usePathname();
  const day = useActiveDay();
  const openSheet = useUIStore((s) => s.openSheet);
  return (
    <div className="navbar">
      <div className="navpill">
        {NAV_MAIN.map((n) => (
          <Link
            key={n.href}
            href={withDay(n.href, day)}
            className={`nav-item${pathname === n.href ? " active" : ""}`}
          >
            <span className="ni">
              <n.Icon size={21} strokeWidth={2} />
            </span>
            {n.label}
          </Link>
        ))}
      </div>
      <button className="fab" onClick={() => openSheet("register")} aria-label="Registrar">
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
