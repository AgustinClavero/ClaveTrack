"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Cambio de contraseña tras el link del email. Supabase abre esta página con
 * una sesión de recuperación ya activa, así que alcanza con pedir la nueva.
 */
export function ResetView() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Sin sesión de recuperación no hay nada que cambiar: el link venció o se abrió mal.
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setReady(!!data.session));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message.toLowerCase().includes("at least") ? "Necesita al menos 6 caracteres." : "No se pudo cambiar. Probá de nuevo.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/today");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="login">
      <div className="login-body reset-only">
        <div className="login-brand">
          <div className="logo">C</div>
          <h1>Nueva contraseña</h1>
          <p>Elegí una y volvés a entrar.</p>
        </div>

        <div className="login-auth">
          {done ? (
            <p className="auth-msg">Listo. Entrando…</p>
          ) : !ready ? (
            <p className="auth-msg error">
              Este link no es válido o ya venció. Pedí uno nuevo desde &quot;¿Olvidaste tu contraseña?&quot;.
            </p>
          ) : (
            <form onSubmit={save}>
              <div className="field">
                <label htmlFor="np">Contraseña nueva</label>
                <div className="pw-wrap">
                  <input
                    id="np"
                    type={showPw ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
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

              <button type="submit" className="btn-dark auth-submit" disabled={loading}>
                {loading ? "Guardando…" : "Guardar y entrar"}
              </button>
            </form>
          )}
        </div>

        <div className="login-foot">
          Desarrollado por <b>Clave Code</b>
        </div>
      </div>
    </div>
  );
}
