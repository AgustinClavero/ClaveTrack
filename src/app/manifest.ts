import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // id fijo: sin esto el navegador identifica la app por start_url y un
    // cambio de ruta de arranque la trataría como otra app distinta.
    id: "/",
    name: "ClaveTrack",
    short_name: "ClaveTrack",
    description: "Tu sistema operativo personal: nutrición, peso, hábitos y objetivos.",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f3",
    theme_color: "#0a0a0b",
    categories: ["health", "lifestyle", "productivity"],
    lang: "es-AR",
    dir: "ltr",
    // Accesos directos desde el ícono, con pulsación larga.
    shortcuts: [
      { name: "Registrar comida", url: "/nutrition" },
      { name: "Trabajo", url: "/work" },
      { name: "Progreso", url: "/progress" },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
