"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NAV_FULL, NAV_SECONDARY, withDay } from "./nav-items";
import { StreakBadge } from "./StreakBadge";
import { ThemeToggle } from "./ThemeToggle";
import { useActiveDay } from "@/lib/hooks/use-active-day";

/**
 * Cajón lateral de móvil. La barra inferior deja afuera Progreso y Ajustes;
 * acá está todo, incluido cerrar sesión.
 */
export function MobileMenu({ streak }: { streak: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const day = useActiveDay();

  // Al navegar se cierra solo; si no, el cajón queda tapando la página nueva.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menú">
        <Menu size={18} />
      </button>

      <div className={`drawer-backdrop${open ? " on" : ""}`} onClick={() => setOpen(false)} aria-hidden />

      <aside className={`drawer${open ? " on" : ""}`} role="dialog" aria-modal="true" aria-label="Menú">
        <header className="drawer-head">
          <div className="hb">
            <div className="logo">C</div>
            <b>ClaveTrack</b>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </header>

        <StreakBadge streak={streak} />

        <nav className="drawer-nav">
          {NAV_FULL.map((n) => (
            <Link key={n.href} href={withDay(n.href, day)} className={`drawer-link${pathname === n.href ? " on" : ""}`}>
              <span className="ic">
                <n.Icon size={18} strokeWidth={2} />
              </span>
              {n.label}
            </Link>
          ))}
        </nav>

        <nav className="drawer-nav drawer-foot">
          {NAV_SECONDARY.map((n) => (
            <Link key={n.href} href={n.href} className={`drawer-link${pathname === n.href ? " on" : ""}`}>
              <span className="ic">
                <n.Icon size={18} strokeWidth={2} />
              </span>
              {n.label}
            </Link>
          ))}
          <ThemeToggle variant="switch" />
          <button className="drawer-link" onClick={logout}>
            <span className="ic">
              <LogOut size={18} strokeWidth={2} />
            </span>
            Cerrar sesión
          </button>
        </nav>
      </aside>
    </>
  );
}
