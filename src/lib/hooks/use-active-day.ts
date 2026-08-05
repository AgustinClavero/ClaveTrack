"use client";

import { useSearchParams } from "next/navigation";

/**
 * Fecha que se está viendo, tomada del `?d=` que escriben las flechas de PageDate.
 * `undefined` significa hoy: el servidor resuelve el día y valida el rango,
 * así que esto es solo la intención del cliente, nunca la fuente de la verdad.
 */
export function useActiveDay(): string | undefined {
  const params = useSearchParams();
  const d = params.get("d");
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
}
