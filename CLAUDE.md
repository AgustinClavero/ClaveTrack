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
botones/FAB/anillos-de-área/gráfico/racha/nivel/score en negro/gris. **Solo los anillos
de macros llevan color**: proteína=rojo, carbos=ámbar, grasa=azul, calorías/🔥=negro.
Nav flotante tipo píldora + FAB oscuro (móvil), sidebar (desktop). Dark mode: fondo
`#0a0a0b`. Gamificación **sobria** (anillos + barra de nivel, sin mascotas ni confeti).
**Paddings/márgenes GENEROSOS. Desktop FULL WIDTH**: grid de widgets de 12 columnas,
sin sub-grids anidados (eso causaba columnas disparejas). Breakpoints: 768 (tablet)
y 1024 (desktop). Targets táctiles ≥ 44px y `:focus-visible` global.
Referencia visual de nutrición: foto de la comida **como banner a sangre** en el
detalle, macros en cards separadas, filas de comida con miniatura.

## Estado actual
- **Auth + onboarding**: wizard de 6 pasos (datos personales → peso → plan →
  hábitos → objetivos → resumen) con calculadora Mifflin-St Jeor (presets de
  déficit/mantenimiento/volumen) y guardado por Server Action idempotente.
- **Motor de cumplimiento** con renormalización de pesos, `daily_scores`
  materializada, racha por umbral configurable y XP/nivel acumulado real.
- **Nutrición completa**: catálogo de alimentos (38 base + alta propia), registro de
  comidas con foto, detalle con banner y porciones reescalables, agua.
- **Hábitos**: CRUD completo, valores numéricos con stepper, hábitos clave.
- **Ajustes** (`/settings`): objetivos, perfil, hábitos, pesos del score y umbral.
- **Progreso**: peso con tendencia y rango funcional, racha con anillos por día.

## Próximos pasos (roadmap)
1. Módulo **Trabajo** unificado (Objetivos + Proyectos + Tareas con vistas
   lista/kanban/objetivo) + Pomodoro + Estudio → habilita las áreas Foco/Estudio.
2. **Actividad/entrenamiento** → habilita el área Actividad.
3. Navegación por fecha (el calendario ya es clickeable a nivel visual pero solo se
   ve el día de hoy).
4. Estadísticas, revisión semanal, recordatorios.
5. Despensa/compras/finanzas. Luego: IA e infra SaaS (planes/Stripe/plantillas/i18n).

## Reglas de producto del scoring
El cumplimiento NO puntúa áreas sin datos (se renormaliza). Racha = día con
score ≥ umbral (75 % por defecto, configurable). **Sin comodín**: la racha es
estricta por decisión del usuario. Las calorías de ejercicio no se suman como
crédito para comer más. Sobre-cumplir topea en 100 %, no da extra.
