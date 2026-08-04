"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "icon-btn" }: { className?: string }) {
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

  return (
    <button className={className} onClick={toggle} aria-label="Cambiar tema">
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
