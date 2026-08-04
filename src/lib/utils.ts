import { clsx, type ClassValue } from "clsx";

/** Une clases condicionalmente. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Formatea números al estilo es-AR (1.234,5). */
export function nf(value: number, decimals = 0) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
