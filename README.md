# ClaveTrack

**Un sistema operativo personal centrado en el día**: nutrición, peso, actividad,
hábitos, rutina y trabajo, en una sola PWA instalable.

La premisa de diseño es una restricción, no un eslogan: **usar toda la app en menos
de 3 minutos al día**. Todo lo demás se subordina a eso.

🔗 **[clave-track.vercel.app](https://clave-track.vercel.app)**

---

## Qué resuelve

Registrar comida en una app, peso en otra, hábitos en una tercera y tareas en una
cuarta significa abandonar las cuatro. ClaveTrack junta esas áreas y las resume en
**un solo número por día**, con una lectura en palabras al cerrarlo.

| Módulo | Qué hace |
|---|---|
| **Inicio** | El día de un vistazo: cumplimiento, áreas, hábitos clave y pendientes |
| **Nutrición** | Catálogo propio de alimentos —incluidos platos preparados con puntaje de calidad—, registro con foto, recetas, mezclas y aderezos, agua y suplementos |
| **Progreso** | Peso con medias móviles de 7 y 30 días, ritmo semanal, calendario mensual con detalle por día, hitos y logros |
| **Actividad** | Sesiones con cálculo por METs, hábitos de movimiento y pasos |
| **Rutina** | Planificar el día, leer y dormir, sincronizado con el check-in |
| **Trabajo** | Objetivos → proyectos → tareas con checklist, vista lista y kanban, y pomodoro |
| **Ajustes** | Objetivos, perfil, hábitos, suplementos, pesos de cada área y umbral de racha |

### Nutrition Score — puntuar decisiones, no exactitud

Contar calorías al gramo es preciso y sirve poco: nadie sostiene esa fricción. El
score evalúa por **zonas**, con un reparto explícito: calorías 25, proteína 25,
calidad de los alimentos 25, verduras 10, agua 10 y fruta 5.

Es **asimétrico a propósito**: quedarse corto penaliza menos que pasarse. Y el
ejercicio no genera crédito para comer más — esa suma es justo el bucle que rompe
los planes de nutrición.

### Motor de cumplimiento

- Las áreas **sin datos no puntúan**: los pesos se renormalizan sobre lo que sí se
  registró, así que no registrar algo no es lo mismo que hacerlo mal.
- El score diario se **materializa** en `daily_scores` y se recalcula en cada
  mutación, en lugar de recomputarse en cada lectura.
- **Racha estricta**, sin comodines: un día cuenta si supera el umbral (75 % por
  defecto, configurable). Sobre-cumplir topea en 100 %; no da extra.
- Un módulo nuevo entra al motor exponiendo su área en `computeAreasForDay()`, sin
  tocar el núcleo.

### Check-in y bienestar

Ánimo, energía, sueño, horas dormidas, hambre y estrés se combinan en un índice que
devuelve el estado del día y una sugerencia de carga.

### Integración con Strava

Conexión por **OAuth** más un **webhook**: la caminata o la salida se registra sola
al terminarla, se mapea al tipo de sesión correspondiente y se estima su intensidad.

Cada sesión guarda su origen y el id en el origen, porque Strava **reenvía eventos**
y sin esa clave la misma caminata entraría dos veces.

---

## Decisiones técnicas que vale la pena mirar

**El día se calcula siempre en la zona horaria del usuario**, nunca en UTC ni con la
del navegador. Hay una única fuente (`getUserContext().today`) y las Server Actions
**derivan la fecha en el servidor**: el cliente no la manda. Sin esto, registrar algo
a las 23:50 lo mandaba al día siguiente.

**Dominio puro y aislado** en `src/lib/calculations/` — macros, TDEE, scoring,
nutrition score, bienestar, tendencia de peso, insights. Sin red y sin Supabase:
son funciones que reciben datos y devuelven números.

**Lecturas y escrituras separadas.** Las consultas viven en `src/lib/data/queries.ts`,
una por pantalla, y **nunca escriben**. Las mutaciones son Server Actions por módulo:
validan con Zod, verifican la pertenencia del recurso, devuelven un `ActionResult`
tipado y re-materializan el score. Un componente cliente no escribe en la base.

**La UI no miente.** Todo llamador de una acción muestra el error y **revierte el
update optimista** si falla.

**Seguridad por defecto.** Row Level Security uniforme en las 22 tablas
(`(select auth.uid()) = user_id`) y bucket privado de fotos con RLS por carpeta. El
middleware es lista negra: todo pide sesión salvo `/login` y `/auth`, así que **una
ruta nueva nace protegida**.

**Next.js 14.2.35 fijado exacto**, y no es desidia: subir a 15/16 rompe `cookies()`
async y enfrenta Turbopack con el plugin PWA de webpack.

---

## Stack

**Next.js 14** (App Router, Server Components y Server Actions) · **TypeScript
estricto** · **Supabase** (Postgres, Auth, Storage y RLS) vía `@supabase/ssr` ·
**Zod** · **Zustand** (solo estado de UI efímero) · **TanStack Query** ·
**date-fns** · **lucide-react** · **PWA** con `@ducanh2912/next-pwa`.

Tailwind entra **solo por el preflight**: el design system son clases propias en
`globals.css`, con tokens de espaciado, tipografía y radios.

**18 migraciones** versionadas en `supabase/migrations/`.

## Diseño

Blanco y negro, sin verde decorativo. El color aparece donde **significa** algo: los
anillos de macros (proteína rojo, carbos ámbar, grasa azul) y la escala de
cumplimiento (rojo → naranja → ámbar → lima → verde, con el verde reservado a ≥ 90).

Navegación flotante tipo píldora con FAB en móvil, sidebar en escritorio, modo
oscuro, objetivos táctiles de 44 px o más y `:focus-visible` global. Gamificación
sobria: anillos y barra de nivel, sin mascotas ni confeti.

## Correr en local

```bash
npm install
npm run dev     # http://localhost:3000
```

Copiá `.env.example` a `.env.local` y completá la URL y la anon key de tu proyecto
Supabase. Después, aplicá las migraciones de `supabase/migrations/` en orden.

Los tipos de la base se regeneran tras cada migración con
`npx supabase gen types typescript --project-id <tu-project-id> > src/types/database.ts`.

> Un par de fricciones conocidas: `npm run build` pisa el cache de `.next` y tumba el
> dev server en marcha (cortalo, borrá `.next` y volvé a levantar). Y si te da HTTP
> 431 en localhost es por cookies viejas de otros proyectos en el mismo puerto:
> incógnito, o `npm run dev -- -p 3010`.

## Deuda conocida

Prefiero decirla a que se descubra:

- **Sin tests.** Es la deuda cara: el dominio de `src/lib/calculations/` es puro y es
  exactamente lo que más duele equivocar. Es el primer lugar donde empezar.
- ESLint sin configurar.
- `daysBetween` duplicado entre `insights.ts` y `weight-trend.ts`.
- El hábito "x por semana" cuenta cualquier sesión de la semana, no solo la de su
  deporte.

## Roadmap

1. **Correlaciones y revisión semanal** — cruzar sueño, ánimo y energía contra
   adherencia. Necesita unos 30 días de histórico para no reportar ruido.
2. Foco del día con pregunta de cierre (el campo ya existe en la base, falta la UI).
3. Notificación push real a medianoche (service worker + disparador de servidor).
4. Despensa, compras y finanzas.
5. Más adelante: IA e infraestructura SaaS.
