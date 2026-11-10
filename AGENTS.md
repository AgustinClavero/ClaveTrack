# AGENTS.md — ClaveTrack (`ClaveTrack/clavetrack-app`)

> Fuente única de reglas, estado e historial de este proyecto, para Claude Code y Codex.
> `CLAUDE.md` es solo `@AGENTS.md`: editá este archivo.
> Antes de tocar nada: leé `T:/CLAVE USER/Desktop/PROYECTOS-CLAUDE/AGENTS.md` (reglas del workspace)
> y las últimas entradas de `T:/CLAVE USER/Desktop/PROYECTOS-CLAUDE/docs/BITACORA.md`.
>
> Última actualización: 2026-11-10

## Qué es

"Sistema operativo personal" centrado en el día: nutrición, peso, actividad, hábitos, rutina y
trabajo (objetivos, proyectos, tareas, pomodoro), en una PWA. Es de uso personal del owner (hoy
2 usuarios en la base); la idea a futuro es un SaaS, pero nada está hecho para eso todavía. Filosofía:
usar toda la app en menos de 3 minutos al día. Se parece a Notion + MyFitnessPal + TickTick + Habitica.

Estado: en uso personal, sin lanzamiento comercial. URL: `https://clave-track.vercel.app`.
Repo: `AgustinClavero/ClaveTrack` (ramas `main` y `historia-anterior`). Último commit de código:
2026-08-07 (Strava); último commit en general: 2026-09-14 (README).

Documentos de estrategia, una carpeta más arriba del repo (fuera de git):
`ClaveTrack/ClaveTrack_Plan.md` y `ClaveTrack/ClaveTrack_Analisis_Arquitectura.md`.

## Cómo se corre

Usa **npm** (hay `package-lock.json`). Es una excepción al "pnpm siempre" del workspace: no migrar sin pedido.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint     # next lint: ESLint NO está configurado, pide instalarlo
```

No hay test ni script de typecheck (el tipado lo cubre `next build`). Sin versión de Node fijada.
Copiar `.env.example` a `.env.local` y completar. Con HTTP 431 en localhost: cookies viejas de otros
proyectos en el puerto, usar incógnito o `npm run dev -- -p 3010`.
`npm run build` pisa `.next` y tumba el dev server en marcha: cortar el dev, `rm -rf .next` y relevantar.

## Stack

- Next.js **14.2.35 fijado exacto** (no subir a 15/16: rompe `cookies()` async y enfrenta Turbopack con el plugin PWA de webpack). React 18.3, TypeScript estricto.
- Supabase (Postgres, Auth, Storage, RLS) con `@supabase/ssr` ^0.12 y `supabase-js` ^2.45.
- Zod 3, Zustand 4 (solo estado de UI efímero), TanStack Query 5, date-fns 3, lucide-react.
- Tailwind 3.4 usado solo por el preflight: el design system es CSS propio en `src/app/globals.css`.
- PWA con `@ducanh2912/next-pwa` (deshabilitada en dev).
- Strava (OAuth + webhook). Hosting en Vercel. Sin Sentry, sin Inngest, sin Resend.

No sigue el stack canónico del workspace (Next 16, pnpm, Sentry): es un proyecto personal fuera del
monorepo. Subir de versión o cambiar de base requiere decisión del owner (ADR).

## Estructura

```
src/app/(auth)/        login y onboarding (wizard de 6 pasos)
src/app/(dashboard)/   today, nutrition, activity, progress, routine, work, settings
src/app/actions/       Server Actions por módulo: activity, checkin, foods, habits, nutrition,
                       profile, progress, strava, work (reexportadas por src/app/actions.ts)
src/app/api/strava/    connect, callback, webhook
src/app/auth/reset     recuperación de contraseña
src/lib/calculations/  dominio puro (macros, tdee, scoring, nutrition-score, wellbeing,
                       weight-trend, insights, day-summary, activity, work). Sin red ni Supabase
src/lib/data/          context.ts (usuario y día), queries.ts, score.ts, nutrition-day.ts,
                       strava-sync.ts, default-foods.ts
src/lib/validations/   esquemas Zod
src/lib/supabase/      client.ts, server.ts
src/components/        modules/ (pantallas y sheets), shell/, ui/, auth/, settings/
src/middleware.ts      protección de rutas
src/types/database.ts  tipos generados
supabase/migrations/   0001 a 0018, espejo de lo aplicado
```

## Entornos y deploy

- Un solo proyecto Supabase, sin staging: **"Clave Track", ref `wupbgwyansjhfncorhwy`**, sa-east-1,
  en una cuenta Supabase distinta a la del resto del workspace (por el límite de proyectos Free).
  22 tablas con RLS y un bucket privado `meals`.
- Los MCP de Supabase de algunas sesiones ven solo este proyecto: verificar el ref antes de migrar.
- Vercel (`clave-track.vercel.app`). No hay `vercel.json` ni CI en el repo.
- Variables (solo nombres): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; hoy solo la usa el webhook de Strava),
  `NEXT_PUBLIC_APP_URL`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN`.
- Migraciones: se aplican por MCP o SQL editor y después se escribe el archivo en
  `supabase/migrations/` con el siguiente número (`0019_...`). Después regenerar tipos:
  `npx supabase gen types typescript --project-id wupbgwyansjhfncorhwy > src/types/database.ts`.
- Como no hay staging, toda migración con riesgo de pérdida de datos va con backup previo.

## Reglas del proyecto

- **El día se calcula siempre en la zona horaria del usuario**, nunca en UTC ni con la del navegador.
  Fuente única: `getUserContext().today` (`src/lib/data/context.ts`). Las Server Actions derivan la
  fecha en el servidor; el cliente no la manda. Sin esto, registrar a las 23:50 caía en el día siguiente.
- **Dominio puro en `src/lib/calculations/`**, sin red ni Supabase.
- **`computeAreasForDay()` es la única fuente del cálculo de áreas** (lo usan el dashboard y la
  materialización de `daily_scores`). No duplicar. Un módulo nuevo entra al motor exponiendo su área ahí.
- **Lecturas** en `src/lib/data/queries.ts`, una función por pantalla, y nunca escriben.
- **Mutaciones solo en Server Actions** (`src/app/actions/<módulo>.ts`): validan con Zod, verifican la
  pertenencia del recurso, devuelven `ActionResult` y re-materializan el score. Prohibido escribir a
  Supabase desde componentes cliente; la única excepción es subir fotos a Storage, protegido por RLS de carpeta.
- **La UI no miente:** todo llamador de una acción muestra el error y revierte el update optimista si falla.
- **Toda tabla privada:** `user_id`, `created_at`/`updated_at`, RLS con `(select auth.uid()) = user_id` e
  índice por `(user_id, date)`. Hoy la única función de auth usada es `auth.uid()`.
- **Storage:** bucket privado `meals`, ruta `{user_id}/{uuid}.jpg`, RLS por carpeta, URLs firmadas
  (`next.config.mjs` solo permite `/storage/v1/object/sign/**` del host de Supabase).
- **Middleware en lista negra:** todo pide sesión salvo `/login` y `/auth`. Una ruta nueva nace protegida.
  No usar `SUPABASE_SERVICE_ROLE_KEY` en el middleware.
- **Strava:** el webhook usa service role porque llega sin sesión, por eso su archivo no debe importar
  nada de cliente. Cada sesión guarda `source` y `external_id` (índice único `(user_id, external_id)`)
  porque Strava reenvía eventos y sin eso la misma caminata entra dos veces.
- **CSS:** clases con tokens (`--sp-*`, `--fs-*`, `--r-*`). Usar `.pring` para anillos, NO `.ring` (colisiona
  con Tailwind). `--text-2` es el gris legible (AA); `--muted` es para lo decorativo.
- **Diseño firme:** blanco y negro, sin verde decorativo. Color solo donde significa algo: macros
  (proteína rojo, carbos ámbar, grasa azul) y la escala de cumplimiento de `src/lib/score-color.ts`
  (rojo, naranja, ámbar, lima, verde reservado a 90 o más). Gamificación sobria, sin mascotas ni confeti.
  Padding generoso, desktop a ancho completo con grid de 12 columnas sin sub-grids anidados (causaban
  columnas dispares), breakpoints 768 y 1024, targets táctiles de 44 px o más, `:focus-visible` global.
- **Reglas de producto del scoring (decisiones del owner):** el cumplimiento no puntúa áreas sin datos
  (se renormaliza). Racha = día con score igual o mayor al umbral (75 % por defecto, configurable) y
  **sin comodín**. Las calorías del ejercicio no se suman como crédito para comer más. Sobre-cumplir
  topea en 100 %. El Nutrition Score puntúa por zonas (calorías 25, proteína 25, calidad 25, verduras 10,
  agua 10, fruta 5) y es asimétrico: quedarse corto pesa menos que pasarse.
- **El resumen del día** es solo para días cerrados y esa regla vive en el servidor.

## Estado actual

Funcionando: auth con registro y recuperación de contraseña; onboarding con Mifflin-St Jeor; motor de
cumplimiento con `daily_scores`, racha y XP; nutrición (catálogo de unos 148 alimentos con 44 platos
preparados, foto, recetas, mezclas, aderezos, agua en ml, suplementos); Nutrition Score; check-in con
índice de bienestar; actividad con METs y pasos editables; rutina; progreso (peso con medias 7/30,
calendario mensual, hitos y logros); módulo Trabajo (objetivos, proyectos, tareas, lista y kanban,
pomodoro); navegación por fecha (`?d=`); ajustes; integración Strava (migración 0018).

No hay ramas ni PR abiertos (solo `main` e `historia-anterior`). Todo lo aplicado está en la única base
Supabase, sin staging.

## Historial

- 2026-09-14: README reescrito con módulos reales, Strava, decisiones técnicas y deuda.
- 2026-08-08: confirmado como candidato a piloto si alguna vez se migra a Neon (decisión diferida).
- 2026-08-07: Strava. Las caminatas se registran solas al terminarlas (OAuth + webhook, migración 0018).
- 2026-08-06: módulo Trabajo completo (migración 0016); registro visible, recuperación de contraseña y
  login rediseñado; fix: ninguna cuenta nueva podía guardar sus hábitos (onboarding).
- 2026-08-06: agua en ml, pasos editables, peso con día propio; gráfico de peso deslizable.
- 2026-08-05: Nutrition Score por zonas; platos preparados y `healthy_score` por alimento; check-in con
  bienestar; resumen del día a pantalla completa; navegación a días anteriores.
- 2026-08-04: catálogo de alimentos v2 con recetas y mezclas, módulo de actividad y hábitos por dominio,
  hitos y logros, calendario mensual.
- 2026-08-04: Fase A: motor de cumplimiento con renormalización, día en timezone del usuario, desktop
  full width. Next fijado en 14.2.35 para no instalar Next 16 + Turbopack. Auth y conexión a Supabase.

## Pendientes

- [ ] **Tests del dominio** en `src/lib/calculations/` (es lo más caro de equivocar). Primera deuda.
- [ ] Configurar ESLint (`next lint` hoy pide instalarlo).
- [ ] `daysBetween` está duplicado en `insights.ts` y `weight-trend.ts`.
- [ ] El hábito "x por semana" cuenta cualquier sesión de la semana, no solo la de su deporte.
- [ ] Enlace roto: `src/app/(dashboard)/today/page.tsx:170` apunta a `/habits` ("Ver todos") y no existe esa ruta.
- [ ] Correlaciones y revisión semanal (sueño, ánimo, energía contra adherencia). Necesita unos 30 días de histórico.
- [ ] Foco del día con pregunta de cierre (`daily_logs.focus_done` existe, falta la UI).
- [ ] Notificación push real a las 00:00 (service worker + disparador de servidor).
- [ ] Despensa, compras y finanzas; después IA e infra SaaS (si hay IA: `ai_usage` + `checkBudget`, regla del workspace).
- [ ] Neon: DIFERIDO por decisión del owner (2026-08-08). Se retoma si hacen falta 4 o más proyectos Supabase activos a la vez. ClaveTrack es el piloto elegido (22 tablas, RLS uniforme con solo `auth.uid()`, capa de datos centralizada). Requiere ADR porque rompe el stack canónico.
- [ ] Unificar la cuenta Supabase de Clave Track con la del resto del workspace (hoy está separada; la bitácora dice que hay que pausar `matcheando-staging` y transferirlo).

## Trampas conocidas

- Subir Next a 15/16 rompe `cookies()` (pasa a async) y el plugin PWA. No hacerlo sin plan.
- `.ring` colisiona con Tailwind: usar `.pring`.
- `npm run build` con el dev server corriendo corrompe `.next`.
- HTTP 431 en localhost por cookies de otros proyectos en el mismo puerto.
- Tras cada migración hay que regenerar `src/types/database.ts`, o el tipado queda desfasado.
- Índices únicos parciales y `ON CONFLICT`: la migración 0017 convirtió un único parcial de hábitos en
  no parcial. `workouts_user_external_idx` es parcial (`where external_id is not null`): no usarlo como
  destino de un `upsert` sin revisarlo.
- Los tokens de Strava (`access_token`, `refresh_token`) se guardan en `strava_connections` en texto
  plano y la policy del dueño es `for all`: el usuario puede leerlos con su sesión. Evaluar cifrarlos o
  moverlos a una tabla solo de servidor antes de abrir la app a terceros.
- El webhook de Strava no valida firma (Strava no firma los eventos): solo verifica el token de
  suscripción en el GET y resuelve el usuario por `owner_id`. Es idempotente por `external_id`.

## A confirmar

- Cómo despliega Vercel (rama de producción, previews, quién aprueba). No hay `vercel.json` ni CI en el repo.
- `NEXT_PUBLIC_APP_URL` figura en `.env.example` pero ninguna línea de `src/` la lee; confirmar si sobra.
- El árbol principal (`ClaveTrack/clavetrack-app`) tiene cambios sin commitear: `CLAUDE.md` reducido a
  `@AGENTS.md` y un `AGENTS.md` sin trackear de 136 líneas, con el mismo contenido anterior. Este archivo
  lo reemplaza: al mergear hay que descartar esas copias locales para no pisarse.

## Cómo mantener este archivo

Al cerrar una sesión de trabajo en este proyecto: actualizar "Estado actual", "Historial" y
"Pendientes" y la fecha de "Última actualización", además de la entrada de la bitácora del workspace.
