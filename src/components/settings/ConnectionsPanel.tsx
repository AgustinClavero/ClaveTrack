"use client";

import { useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, Unlink, RefreshCw } from "lucide-react";
import { disconnectStrava, syncStrava } from "@/app/actions";

export interface StravaState {
  connected: boolean;
  athleteName: string | null;
  connectedAt: string | null;
  activities: number;
  configured: boolean;
}

/** Mensajes del ida y vuelta con Strava, que llega por query string. */
const RESULTS: Record<string, { text: string; error?: boolean }> = {
  ok: { text: "Strava conectado. Tus próximas salidas se registran solas." },
  cancelado: { text: "No se conectó: cancelaste el permiso en Strava.", error: true },
  "estado-invalido": { text: "La conexión no se pudo verificar. Probá de nuevo.", error: true },
  "sin-codigo": { text: "Strava no devolvió el permiso. Probá de nuevo.", error: true },
  "sin-config": { text: "Falta configurar las credenciales de Strava en el servidor.", error: true },
  error: { text: "No se pudo conectar con Strava. Probá de nuevo.", error: true },
};

export function ConnectionsPanel({ strava }: { strava: StravaState }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const raw = params.get("strava");
  const imported = raw?.startsWith("ok-") ? Number(raw.slice(3)) : null;
  const result = raw
    ? imported != null
      ? { text: `Strava conectado. Importamos actividades de ${imported} ${imported === 1 ? "día" : "días"}.` }
      : (RESULTS[raw] ?? null)
    : null;

  function sync() {
    setMsg(null);
    startTransition(async () => {
      const res = await syncStrava();
      if (!res.ok) return setMsg({ text: res.error, error: true });
      setMsg({
        text: res.data.imported > 0 ? `Listo: ${res.data.imported} actividades al día.` : "No había nada nuevo.",
      });
      router.refresh();
    });
  }

  function disconnect() {
    setMsg(null);
    startTransition(async () => {
      const res = await disconnectStrava();
      if (!res.ok) return setMsg({ text: res.error, error: true });
      setMsg({ text: "Strava desconectado. Las sesiones ya importadas quedan." });
      router.refresh();
    });
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="panel-head">
          <h2 className="panel-title">Strava</h2>
          {strava.connected && <span className="chip on">Conectado</span>}
        </div>

        <p className="note">
          Cuando termines una caminata, salida en bici o entrenamiento, se registra solo en Actividad. Las calorías
          las calculamos con tu peso, igual que en una sesión cargada a mano.
        </p>

        {(result || msg) && <p className={`auth-msg${(result ?? msg)!.error ? " error" : ""}`}>{(result ?? msg)!.text}</p>}

        {!strava.configured ? (
          <p className="note">
            Falta cargar las credenciales de Strava en el servidor para poder conectarse.
          </p>
        ) : strava.connected ? (
          <>
            <div className="conn-meta">
              {strava.athleteName && <span>{strava.athleteName}</span>}
              <span>{strava.activities} sesiones importadas</span>
            </div>
            <div className="conn-actions">
              <button className="btn-dark" onClick={sync}>
                <RefreshCw size={16} /> Sincronizar ahora
              </button>
              <button className="head-action" onClick={disconnect}>
                <Unlink size={16} /> Desconectar
              </button>
            </div>
          </>
        ) : (
          <a className="btn-dark conn-connect" href="/api/strava/connect">
            <Link2 size={16} /> Conectar con Strava
          </a>
        )}
      </div>
    </div>
  );
}
