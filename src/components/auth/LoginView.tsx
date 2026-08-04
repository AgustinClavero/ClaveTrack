"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=800`;

const TILES = [
  { cls: "t-food", img: PX(3297807), emoji: "🥗", lbl: "Comidas" },
  { cls: "t-train", img: PX(4162475), emoji: "🏋️", lbl: "Entrenos" },
  { cls: "t-habit", img: PX(1458671), emoji: "💧", lbl: "Hábitos" },
  { cls: "t-progress", img: PX(8454909), emoji: "🏃", lbl: "Progreso" },
];

export function LoginView() {
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <div className="login">
      <div className="login-hero">
        {TILES.map((t) => (
          <div key={t.lbl} className={`hero-tile ${t.cls}`}>
            {failed[t.lbl] ? (
              <span className="emoji">{t.emoji}</span>
            ) : (
              <img
                src={t.img}
                alt={t.lbl}
                loading="eager"
                onError={() => setFailed((f) => ({ ...f, [t.lbl]: true }))}
              />
            )}
            <span className="lbl">{t.lbl}</span>
          </div>
        ))}
      </div>

      <div className="login-body">
        <div className="login-brand">
          <div className="logo">C</div>
          <h1>ClaveTrack</h1>
          <p>Tu sistema operativo personal</p>
        </div>

        <div className="login-auth">
          {!open && (
            <button className="btn-dark" onClick={() => setOpen(true)}>
              <Lock size={17} strokeWidth={2.5} />
              Ingresar con contraseña
            </button>
          )}

          <div className={`reveal${open ? " open" : ""}`}>
            <div>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="tu@email.com" autoComplete="email" />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <div className="pw-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>
              <Link href="/onboarding" className="btn-dark" style={{ textDecoration: "none", marginTop: 4 }}>
                Ingresar
              </Link>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
            Autenticación con Supabase pendiente de conectar (Fase 1).
          </p>
        </div>

        <div className="login-foot">
          Desarrollado por <b>Clave Code</b>
        </div>
      </div>
    </div>
  );
}
