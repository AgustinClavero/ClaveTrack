"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";

/**
 * Cambio de tema. `switch` es la forma del sidebar: fila con etiqueta e
 * interruptor, para que se lea qué hace sin tener que probarlo.
 */
export function ThemeToggle({
  className = "icon-btn",
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "switch";
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ct-theme", next);
    } catch {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#0a0a0b" : "#f5f5f3");
    setDark(!dark);
  }

  if (variant === "switch") {
    return (
      <button className="drawer-link theme-switch" onClick={toggle} role="switch" aria-checked={dark}>
        {/* Ícono fijo: en un interruptor el estado lo dice la perilla, no el ícono. */}
        <span className="ic">
          <Moon size={18} strokeWidth={2} />
        </span>
        Modo nocturno
        <span className="sw" aria-hidden />
      </button>
    );
  }

  return (
    <button className={className} onClick={toggle} aria-label="Cambiar tema">
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
