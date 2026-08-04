"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=800`;

const TILES = [
  { cls: "t-food", img: PX(3297807), emoji: "🥗", lbl: "Comidas" },
  { cls: "t-train", img: PX(4162475), emoji: "🏋️", lbl: "Entrenos" },
  { cls: "t-habit", img: PX(1458671), emoji: "💧", lbl: "Hábitos" },
  { cls: "t-progress", img: PX(8454909), emoji: "🏃", lbl: "Progreso" },
];

export function LoginView() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          setInfo("Te enviamos un email para confirmar tu cuenta. Confirmalo y volvé a ingresar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/today");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-hero">
        {TILES.map((t) => (
          <div key={t.lbl} className={`hero-tile ${t.cls}`}>
            {failed[t.lbl] ? (
              <span className="emoji">{t.emoji}</span>
            ) : (
              <img src={t.img} alt={t.lbl} loading="eager" onError={() => setFailed((f) => ({ ...f, [t.lbl]: true }))} />
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
            <form onSubmit={submit}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <div className="pw-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
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

              {error && <p style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>{error}</p>}
              {info && <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>{info}</p>}

              <button type="submit" className="btn-dark" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Ingresar"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 14 }}>
              {mode === "signin" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setInfo(null);
                }}
                style={{ background: "none", border: "none", color: "var(--text)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
              >
                {mode === "signin" ? "Crear una" : "Ingresar"}
              </button>
            </p>
          </div>
        </div>

        <div className="login-foot">
          Desarrollado por <b>Clave Code</b>
        </div>
      </div>
    </div>
  );
}
