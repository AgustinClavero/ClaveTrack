import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ClaveTrack",
  description: "Tu sistema operativo personal: nutrición, peso, hábitos y objetivos.",
  applicationName: "ClaveTrack",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ClaveTrack" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Evita el "flash" de tema: aplica el tema guardado antes de pintar.
const themeInit = `(function(){try{var t=localStorage.getItem('ct-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
