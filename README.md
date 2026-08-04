# ClaveTrack

Tu **sistema operativo personal**: nutrición, peso, hábitos, objetivos y más.
PWA instalable, mobile-first, en blanco y negro (estilo Cal AI / Fitia).

Este repositorio es el **arranque de la Fase 1 (MVP)**. Las pantallas funcionan con
**datos de ejemplo (mock)**; la conexión a Supabase queda lista para enchufar.

## Stack

Next.js (App Router) · TypeScript estricto · Tailwind CSS · Supabase (pendiente) ·
TanStack Query · Zustand · Zod · PWA (@ducanh2912/next-pwa).

## Puesta en marcha

```bash
npm install
npm run dev
# abrir http://localhost:3000  (redirige a /today)
```

Para probar la instalación como PWA, generá una build de producción:

```bash
npm run build && npm start
```

(Los service workers solo se activan en producción o vía HTTPS / localhost.)

## Estructura

```
src/
  app/
    (auth)/            login, onboarding
    (dashboard)/       today, nutrition, progress, habits (+ layout con shell)
    layout.tsx         raíz (tema, providers)
    manifest.ts        manifest PWA
  components/
    ui/                Ring (anillo SVG)
    shell/             Sidebar, BottomNav, RegisterSheet, MobileHeader, ThemeToggle
    modules/           MacroRing, WeekStrip, WeightChart, HabitList, QuickButtons
  lib/
    calculations/      macros.ts (cálculo de macros) · scoring.ts (cumplimiento)
    data/mock.ts       datos de ejemplo (reemplazar por repositorios Supabase)
    supabase/          clientes browser/server (activan al configurar env)
    store.ts           estado UI (Zustand)
  types/               tipos de dominio
supabase/
  migrations/0001_init.sql   tablas MVP + RLS
  seed.sql                   datos demo
```

## Conectar Supabase (siguiente bloque)

1. Crear proyecto en Supabase y copiar URL + claves a `.env.local` (ver `.env.example`).
2. Aplicar `supabase/migrations/0001_init.sql` (tablas + RLS).
3. Reemplazar `src/lib/data/mock.ts` por repositorios que consulten Supabase
   (las firmas ya son `async`, así que la UI no cambia).
4. Validar RLS con dos usuarios de prueba.

## Diseño

- Paleta **blanco y negro**; los anillos de macros usan color (proteína rojo,
  carbos ámbar, grasa azul) solo por legibilidad, como en Cal AI.
- Modo claro y **modo oscuro** (fondo negro con grises neutros).
- Navegación inferior tipo píldora + FAB en móvil; sidebar en escritorio.
- Paddings y márgenes amplios: nada apretado.

## Estado (Fase 1)

Hecho: scaffold, design system, layout responsive, pantallas Hoy / Nutrición /
Progreso / Hábitos con mock, cálculos de macros y cumplimiento, PWA, migraciones SQL.

Pendiente: Auth real, onboarding con guardado, registro de comidas/peso/hábitos
contra Supabase, subida de fotos a Storage, tests.
