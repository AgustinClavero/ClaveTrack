# ClaveTrack — Contexto para Claude Code

> Este archivo lo lee Claude Code automáticamente. Resume el proyecto, las decisiones
> tomadas y las convenciones para continuar sin re-preguntar lo ya definido.

## Qué es
ClaveTrack es un **"sistema operativo personal" centrado en el día**: nutrición, peso,
actividad, hábitos, tareas/proyectos, estudio, despensa/compras, pomodoro y
revisión. Filosofía: usar toda la app en **< 3 minutos al día**. Mezcla de
Notion + MyFitnessPal + TickTick + Habitica + Apple Health. A futuro, SaaS.
Documentos de estrategia (una carpeta más arriba): `ClaveTrack_Plan.md` y
`ClaveTrack_Analisis_Arquitectura.md`.

## Stack
Next.js **14.2.35 (fijado exacto — NO subir a 15/16**: rompe `cookies()` async y
Turbopack vs el plugin PWA webpack) · TypeScript estricto · Tailwind (solo preflight;
el design system es CSS propio) · Supabase (Postgres/Auth/Storage/RLS) vía
`@supabase/ssr` · Zod · Zustand (estado UI efímero) · lucide-react · date-fns · PWA
(`@ducanh2912/next-pwa`, deshabilitada en dev).

## Cómo correr
```bash
npm install
npm run dev   # http://localhost:3000
```
`.env.local` ya existe localmente (URL + anon key de Supabase). No se commitea.
Si aparece HTTP 431 en localhost, es por cookies viejas de otros proyectos en el
puerto: usar incógnito o `npm run dev -- -p 3010`.
⚠️ `npm run build` pisa el cache de `.next` y rompe el dev server en marcha: cortar
el dev, `rm -rf .next` y volver a levantarlo.

## Supabase
Proyecto **"Clave Track"**, ref **wupbgwyansjhfncorhwy** (sa-east-1). Migraciones en
`supabase/migrations/` (espejo local de lo aplicado; aplicar por MCP y escribir el
archivo). Toda tabla privada: `user_id` + `created_at`/`updated_at` + **RLS**
(política owner con `(select auth.uid())`) + índice por `(user_id, date)`.
Tipos generados en `src/types/database.ts` — **regenerar tras cada migración**:
`npx supabase gen types typescript --project-id wupbgwyansjhfncorhwy > src/types/database.ts`
Storage: bucket privado `meals` con ruta `{user_id}/{uuid}.jpg` y RLS por carpeta.

## Arquitectura y convenciones (no negociables)
- **El día se calcula SIEMPRE en la timezone del usuario**, nunca en UTC ni con la
  del navegador. Fuente única: `getUserContext().today` (`src/lib/data/context.ts`).
  Las Server Actions **derivan la fecha en el servidor**; el cliente no la manda.
- **Dominio puro y testeable** en `src/lib/calculations/` (macros, scoring, tdee).
  Sin red, sin Supabase.
- **`computeAreasForDay()` es la única fuente del cálculo de áreas**: la usan tanto
  la lectura del dashboard como la materialización de `daily_scores`. No duplicar.
- **Lecturas** en `src/lib/data/queries.ts`, una función por pantalla. **Nunca escriben.**
- **Mutaciones** en `src/app/actions/<módulo>.ts` (habits, checkin, nutrition, profile),
  reexportadas por `src/app/actions.ts`. Toda acción: valida con Zod
  (`src/lib/validations/`), verifica pertenencia del recurso, devuelve
  `ActionResult` y re-materializa el score. Prohibido escribir a Supabase desde
  componentes cliente (excepto subir archivos a Storage, que RLS protege por carpeta).
- **La UI no miente**: todo caller de una acción muestra el error y revierte el
  update optimista si falla.
- **UI**: Server Components para leer, Client Components para interactuar.
- **CSS**: design system por clases en `src/app/globals.css`, con tokens
  (`--sp-*`, `--fs-*`, `--r-*`). ⚠️ Usar la clase **`.pring`** para anillos, NO `.ring`
  (colisiona con Tailwind). `--text-2` es el gris de texto legible (AA); `--muted`
  queda para lo decorativo.
- El middleware es **lista negra**: todo requiere sesión salvo `/login` y `/auth`.
  Una ruta nueva nace protegida.
- Al agregar un módulo nuevo, que exponga su área en `computeAreasForDay` para que el
  motor de cumplimiento lo tome sin tocar el core.

## Diseño (firme)
Estilo Cal AI + Fitia pero **BLANCO Y NEGRO, sin verde**. Números grandes negros;
botones/FAB/anillos-de-área/gráfico/racha/nivel/score en negro/gris. **Los anillos de macros llevan
color** (proteína=rojo, carbos=ámbar, grasa=azul) y **el cumplimiento usa una escala
propia** (`src/lib/score-color.ts`): rojo → naranja → ámbar → lima → verde, con el
verde reservado a ≥90. Fuera de eso, negro y gris.
Nav flotante tipo píldora + FAB oscuro (móvil), sidebar (desktop). Dark mode: fondo
`#0a0a0b`. Gamificación **sobria** (anillos + barra de nivel, sin mascotas ni confeti).
**Paddings/márgenes GENEROSOS. Desktop FULL WIDTH**: grid de widgets de 12 columnas,
sin sub-grids anidados (eso causaba columnas disparejas). Breakpoints: 768 (tablet)
y 1024 (desktop). Targets táctiles ≥ 44px y `:focus-visible` global.
Referencia visual de nutrición: foto de la comida **como banner a sangre** en el
detalle, macros en cards separadas, filas de comida con miniatura.

## Estado actual
- **Auth + onboarding**: wizard de 6 pasos con calculadora Mifflin-St Jeor y
  guardado por Server Action idempotente.
- **Motor de cumplimiento** con renormalización de pesos, `daily_scores`
  materializada, racha por umbral configurable y XP/nivel acumulado real.
- **Nutrición**: catálogo de ~148 alimentos (incluye 44 platos preparados con
  `healthy_score`), registro con foto, detalle con banner, recetas, mezclas y
  aderezos, agua en ml, suplementos.
- **Nutrition Score** (`src/lib/calculations/nutrition-score.ts`): puntúa decisiones
  por **zonas**, no exactitud. Calorías 25, proteína 25, calidad 25, verduras 10,
  agua 10, fruta 5. Asimétrico: quedarse corto pesa menos que pasarse.
- **Resumen del día**: modal a pantalla completa con lectura en palabras. Solo para
  días cerrados (la regla vive en el servidor). Se llega desde la campanita, el
  detalle del día y una card al final de Inicio.
- **Check-in con índice de bienestar** (`wellbeing.ts`): ánimo, energía, sueño,
  horas dormidas, hambre y estrés → Estado del día + sugerencia de carga.
- **Actividad**: sesiones con METs, hábitos de movimiento, pasos editables a mano.
- **Rutina**: planificar el día, leer, dormir (sincronizado con el check-in).
- **Navegación por fecha** en Nutrición/Actividad/Rutina (`?d=`), validada en servidor.
- **Progreso**: peso con medias móviles 7/30 y ritmo semanal, gráfico deslizable,
  calendario mensual con detalle por día, hitos y logros.
- **Ajustes** (`/settings`): objetivos, perfil, hábitos, suplementos, pesos y umbral.

## Próximos pasos (roadmap)
1. Módulo **Planificación/Trabajo**: Proyectos → Tareas (checklist + descripción),
   vistas lista/kanban, y más adelante Objetivos y Pomodoro → habilita Foco/Estudio.
2. **Correlaciones y revisión semanal**: cruzar sueño/ánimo/energía contra
   adherencia. Necesita ~30 días de histórico para no reportar ruido.
3. Foco del día con pregunta de cierre (`daily_logs.focus_done` ya existe, sin UI).
4. Notificación push real a las 00:00 (service worker + disparador de servidor).
5. Despensa/compras/finanzas. Luego: IA e infra SaaS.

## Deuda conocida
- **Sin tests.** El dominio en `src/lib/calculations/` es puro y es lo que más caro
  sale equivocar: es el primer lugar donde conviene empezar.
- ESLint sin configurar (`next lint` pide instalarlo).
- `daysBetween` duplicado en `insights.ts` y `weight-trend.ts`.
- Enlace roto a `/habits` en Inicio ("Ver todos" de Hábitos clave).
- El hábito "x/sem" cuenta cualquier sesión de la semana, no solo la de su deporte.

## Reglas de producto del scoring
El cumplimiento NO puntúa áreas sin datos (se renormaliza). Racha = día con
score ≥ umbral (75 % por defecto, configurable). **Sin comodín**: la racha es
estricta por decisión del usuario. Las calorías de ejercicio no se suman como
crédito para comer más. Sobre-cumplir topea en 100 %, no da extra.
