"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=800`;

const TILES = [
  { cls: "t-food", img: PX(3297807), emoji: "🥗", lbl: "Comidas" },
  { cls: "t-train", img: PX(4162475), emoji: "🏋️", lbl: "Entrenos" },
  { cls: "t-habit", img: PX(1458671), emoji: "💧", lbl: "Hábitos" },
  { cls: "t-work", img: PX(3184292), emoji: "💻", lbl: "Trabajo" },
];

/** Los errores de Supabase vienen en inglés y con jerga: se traducen. */
function readableError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirmá tu email antes de ingresar. Revisá tu casilla.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con ese email. Probá ingresar.";
  if (m.includes("password should be at least")) return "La contraseña necesita al menos 6 caracteres.";
  if (m.includes("unable to validate email")) return "Ese email no parece válido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Esperá un momento.";
  return "Algo salió mal. Probá de nuevo.";
}

export function LoginView() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // Vuelve al mismo dominio desde el que se registró, sea Vercel o local.
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          setInfo("Te mandamos un email para confirmar la cuenta. Confirmalo y volvé a ingresar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/today");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(readableError(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }

  /** Reseteo por email. No revela si la cuenta existe. */
  async function forgot() {
    if (!email) {
      setError("Escribí tu email y volvé a tocar.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) return setError(readableError(error.message));
    setInfo("Si esa cuenta existe, te llega un email para cambiar la contraseña.");
  }

  return (
    <div className="login">
      <div className="login-hero">
        {TILES.map((t) => (
          <div key={t.lbl} className={`hero-tile ${t.cls}`}>
            {failed[t.lbl] ? (
              <span className="emoji">{t.emoji}</span>
            ) : (
              <img src={t.img} alt="" loading="eager" onError={() => setFailed((f) => ({ ...f, [t.lbl]: true }))} />
            )}
          </div>
        ))}

        {/* La marca va sobre el mosaico: el bloque blanco queda solo para el form. */}
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-brand">
          <div className="logo">C</div>
          <h1>ClaveTrack</h1>
          <p>Tu sistema operativo personal</p>
        </div>
      </div>

      <div className="login-body">
        <div className="login-auth">
          <div className="tabs auth-tabs" role="tablist">
            <button role="tab" aria-selected={mode === "signin"} className={`tab${mode === "signin" ? " active" : ""}`} onClick={() => switchMode("signin")}>
              Ingresar
            </button>
            <button role="tab" aria-selected={mode === "signup"} className={`tab${mode === "signup" ? " active" : ""}`} onClick={() => switchMode("signup")}>
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pw">Contraseña</label>
              <div className="pw-wrap">
                <input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
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

            {error && <p className="auth-msg error">{error}</p>}
            {info && <p className="auth-msg">{info}</p>}

            <button type="submit" className="btn-dark auth-submit" disabled={loading}>
              {loading ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Ingresar"}
            </button>
          </form>

          {mode === "signin" && (
            <button type="button" className="auth-link" onClick={forgot} disabled={loading}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>

        <div className="login-foot">
          Desarrollado por <b>Clave Code</b>
        </div>
      </div>
    </div>
  );
}
