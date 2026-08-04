"use client";

import { useEffect, useRef } from "react";

/**
 * Hoja inferior accesible (modal centrado en desktop vía CSS).
 * Cierra con Escape y con click en el overlay; devuelve el foco al salir.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const node = ref.current;
    node?.querySelector<HTMLElement>("input, button, select, textarea")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lastFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <div className={`overlay${open ? " show" : ""}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`sheet ${className}${open ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        <div className="grip" />
        <h3>{title}</h3>
        {subtitle && <div className="sub">{subtitle}</div>}
        {children}
      </div>
    </>
  );
}
