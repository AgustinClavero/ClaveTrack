import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClaveTrack",
    short_name: "ClaveTrack",
    description: "Tu sistema operativo personal: nutrición, peso, hábitos y objetivos.",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f3",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
