# ClaveTrack — Contexto para Claude Code

> Este archivo lo lee Claude Code automáticamente. Resume el proyecto, las decisiones
> tomadas y las convenciones para continuar sin re-preguntar lo ya definido.

## Qué es
ClaveTrack es un **"sistema operativo personal" centrado en el día**: nutrición, peso,
actividad, hábitos, tareas/proyectos, estudio, empleo, despensa/compras, pomodoro y
revisión. Filosofía: usar toda la app en **< 3 minutos al día**. Mezcla de
Notion + MyFitnessPal + TickTick + Habitica + Apple Health. A futuro, SaaS.
Documentos de estrategia (una carpeta más arriba): `ClaveTrack_Plan.md` y
`ClaveTrack_Analisis_Arquitectura.md`. Prototipo visual aprobado del dashboard:
`clavetrack_dashboard_v2.html`.

## Stack
Next.js **14.2.35 (fijado exacto — NO subir a 15/16**: rompe `cookies()` async y
Turbopack vs el plugin PWA webpack) · TypeScript estricto · Tailwind · Supabase
(Postgres/Auth/Storage/RLS) vía `@supabase/ssr` · Zod · TanStack Query · Zustand
(estado UI efímero) · lucide-react (iconos de navegación) · date-fns · PWA
(`@ducanh2912/next-pwa`, deshabilitada en dev).

## Cómo correr
```bash
npm install
npm run dev   # http://localhost:3000
```
`.env.local` ya existe localmente (URL + anon key de Supabase). No se commitea.
Para probar auth: en Supabase → Authentication → Email → desactivar "Confirm email".
Si aparece HTTP 431 en localhost, es por cookies viejas de otros proyectos en el
puerto: usar incógnito o `npm run dev -- -p 3010`.

## Supabase
Proyecto **"Clave Track"**, ref **wupbgwyansjhfncorhwy** (sa-east-1). Migraciones en
`supabase/migrations/`. Toda tabla privada: `user_id` + `created_at`/`updated_at` +
**RLS** (política owner) + índice por `(user_id, date)` en timelines. El "día" se
calcula SIEMPRE en la timezone del usuario (`src/lib/date.ts`), nunca en UTC.

## Arquitectura y convenciones
- **Dominio puro y testeable** en `src/lib/calculations/` (macros, scoring). Sin red.
- **Datos** en `src/lib/data/queries.ts` (lectura, server) y Server Actions en
  `src/app/actions.ts` (mutaciones). Clientes Supabase en `src/lib/supabase/`.
- **UI**: Server Components para leer, Client Components para interactuar. Nada de SQL
  en componentes.
- **CSS**: design system por clases en `src/app/globals.css`. ⚠️ Usar la clase
  **`.pring`** para anillos, NO `.ring` (colisiona con una utilidad de Tailwind).
- Al agregar un módulo nuevo, que exponga un `areaScore(userId, date) → {value,hasData}`
  para que el motor de cumplimiento lo tome sin tocar el core.

## Diseño (firme)
Estilo Cal AI + Fitia pero **BLANCO Y NEGRO, sin verde**. Números grandes negros;
botones/FAB/anillos-de-área/gráfico/racha/nivel/score en negro/gris. **Solo los anillos
de macros llevan color**: proteína=rojo, carbos=ámbar, grasa=azul, calorías/🔥=negro.
Nav flotante tipo píldora + FAB oscuro (móvil), sidebar (desktop). Dark mode: fondo
`#0a0a0b`, grises `#1a1a1d`/`#262629`. Gamificación **sobria** (anillos + barra de nivel,
sin mascotas ni confeti). **Paddings/márgenes GENEROSOS, nada apretado. Desktop FULL
WIDTH** (no un móvil estirado): `.app` sin max-width, grid de widgets.

## Estado actual
- **Fase 1 (hecha):** auth real (login/registro, middleware de sesión), onboarding
  wizard que guarda en DB (perfil, objetivos con carbos+grasa, hábitos, peso), pantallas
  Nutrición/Progreso/Hábitos con datos reales, check-in de hábitos y peso persistentes,
  peso con decimales (94,3).
- **Fase A (hecha):** motor de cumplimiento con **renormalización** de pesos sobre áreas
  con datos (`src/lib/calculations/scoring.ts`), día en timezone del usuario, check-in
  diario (bottom sheet → `daily_logs`), y **nuevo dashboard Hoy** (héroe de cumplimiento,
  nivel/XP, tira de áreas, carrusel de cards, calendario con anillos, desktop full width).
  Nivel/XP es provisional (derivado de la racha) hasta materializar `daily_scores`.

## Próximos pasos (roadmap)
1. Materializar `daily_scores` (y `daily_targets`) para calendario/estadísticas rápidas.
2. **Calculadora automática de macros**: Mifflin-St Jeor + factor de actividad + presets
   (déficit agresivo/moderado(recomendado)/mantenimiento/volumen), editable + modo
   "plan de nutricionista".
3. **Alta real de comidas** desde el botón "+" (hoy la hoja es placeholder) + recetas con
   macros por porción + fotos a Storage.
4. Módulo **Trabajo** unificado (Objetivos + Proyectos + Tareas, vistas lista/kanban/
   objetivo) + Pomodoro + Estudio → habilita las áreas Foco/Estudio del score.
5. Actividad/entrenamiento; despensa/compras/finanzas; estadísticas; revisión semanal;
   recordatorios. Luego: IA e infra SaaS (planes/Stripe/plantillas/i18n).

## Reglas de producto del scoring
El cumplimiento NO debe puntuar áreas sin datos (se renormaliza). Racha = día con
score ≥ 75 % (umbral configurable); propuesta de comodín semanal para no romperla por
un día. Las calorías de ejercicio no se suman como crédito para comer más.
