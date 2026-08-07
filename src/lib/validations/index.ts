// ============================================================
// Esquemas Zod por módulo. TODA Server Action valida su entrada
// con safeParse antes de tocar la DB. La fecha del "día" NUNCA
// viene del cliente: se deriva en servidor (profiles.timezone).
// ============================================================

import { z } from "zod";

// ---------- Primitivas ----------
export const uuid = z.string().uuid();
/**
 * Fecha de registro. Es lo único que el cliente puede elegir del "día":
 * se valida el formato y la acción rechaza futuro o más de un año atrás.
 */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const scale10 = z.number().int().min(1).max(10);

// ---------- Hábitos ----------
export const toggleHabitSchema = z.object({
  habitId: uuid,
  done: z.boolean(),
  date: isoDate.optional(),
});

export const habitValueSchema = z.object({
  habitId: uuid,
  value: z.number().min(0).max(100000),
  date: isoDate.optional(),
});

export const habitKind = z.enum(["boolean", "numeric", "duration", "weekly"]);
export const habitCategory = z.enum(["nutrition", "activity", "routine", "mind"]);

export const habitUpsertSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(80),
  kind: habitKind,
  targetValue: z.number().positive().max(100000).nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  emoji: z.string().trim().max(8).nullable().optional(),
  isKey: z.boolean().optional(),
  category: habitCategory.optional(),
  groupKey: z.string().trim().max(30).nullable().optional(),
});


// ---------- Actividad ----------
export const workoutKind = z.enum([
  "caminata",
  "running",
  "gimnasio",
  "ciclismo",
  "futbol",
  "natacion",
  "boxeo",
  "yoga",
  "otro",
]);

export const workoutSchema = z.object({
  kind: workoutKind,
  minutes: z.number().int().min(1).max(600),
  intensity: z.enum(["suave", "moderada", "fuerte"]),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
  steps: z.number().int().min(0).max(200000).nullable().optional(),
  note: z.string().trim().max(200).optional(),
  date: isoDate.optional(),
});

// ---------- Check-in ----------
export const checkinSchema = z.object({
  weightKg: z.number().min(20).max(400).nullable().optional(),
  mood: scale10.optional(),
  energy: scale10.optional(),
  sleepQuality: scale10.optional(),
  hunger: scale10.optional(),
  stress: scale10.optional(),
  /** Horas dormidas: pesan aparte de la calidad. */
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  focusNote: z.string().trim().max(200).optional(),
  focusDone: z.boolean().optional(),
  date: isoDate.optional(),
});

// ---------- Peso ----------
export const weightSchema = z.object({
  kg: z.number().min(20).max(400),
  date: isoDate.optional(),
});

// ---------- Nutrición ----------
export const foodBase = z.enum(["100g", "100ml", "unidad"]);
export const mealType = z.enum(["desayuno", "almuerzo", "merienda", "cena", "colacion", "bebida"]);

export const foodCategory = z.enum([
  "proteinas",
  "carbohidratos",
  "verduras",
  "frutas",
  "grasas",
  "lacteos",
  "condimentos",
  "otros",
]);

export const foodCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  base: foodBase,
  category: foodCategory.optional(),
  brand: z.string().trim().max(60).nullable().optional(),
  kcal: z.number().min(0).max(9000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
  fiberG: z.number().min(0).max(1000).optional().default(0),
  unitLabel: z.string().trim().max(20).nullable().optional(),
  unitGrams: z.number().positive().max(5000).nullable().optional(),
  state: z.enum(["crudo", "cocido"]).nullable().optional(),
});

export const toggleFavoriteSchema = z.object({
  foodId: uuid,
  favorite: z.boolean(),
});

export const recipeSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(80),
  emoji: z.string().trim().max(8).nullable().optional(),
  servings: z.number().positive().max(20).optional(),
  items: z
    .array(z.object({ foodId: uuid, quantity: z.number().positive().max(100000) }))
    .min(1)
    .max(30),
});

export const logRecipeSchema = z.object({
  recipeId: uuid,
  mealType,
  servings: z.number().positive().max(10).optional(),
  date: isoDate.optional(),
});

const mealItemFromFood = z.object({
  kind: z.literal("food"),
  foodId: uuid,
  quantity: z.number().positive().max(100000),
});

const mealItemManual = z.object({
  kind: z.literal("manual"),
  name: z.string().trim().min(1).max(120),
  kcal: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
});

export const logMealSchema = z.object({
  mealType,
  note: z.string().trim().max(300).optional(),
  /** Ruta en Storage: {user_id}/{archivo}. Se valida la pertenencia en la acción. */
  photoPath: z.string().trim().max(300).nullable().optional(),
  items: z.array(z.discriminatedUnion("kind", [mealItemFromFood, mealItemManual])).min(1).max(30),
  date: isoDate.optional(),
});
export type LogMealInput = z.infer<typeof logMealSchema>;

export const updateMealSchema = z.object({
  mealId: uuid,
  note: z.string().trim().max(300).nullable().optional(),
  photoPath: z.string().trim().max(300).nullable().optional(),
  /** Multiplicador de porciones aplicado a todos los ítems (0.25 a 10). */
  servings: z.number().min(0.25).max(10).optional(),
});

export const nutritionGoalsSchema = z.object({
  kcal: z.number().int().min(800).max(8000),
  proteinG: z.number().int().min(0).max(500),
  carbsG: z.number().int().min(0).max(1000),
  fatG: z.number().int().min(0).max(400),
  waterMl: z.number().int().min(500).max(8000),
  // "imported" ya no se ofrece —cargar el plan del nutricionista es lo mismo
  // que "manual"—, pero se sigue aceptando para no romper lo ya guardado.
  mode: z.enum(["auto", "manual", "imported"]),
  calcInputs: z
    .object({
      sex: z.enum(["male", "female"]),
      age: z.number().int().min(10).max(100),
      heightCm: z.number().min(100).max(250),
      weightKg: z.number().min(20).max(400),
      activity: z.enum(["sedentary", "light", "moderate", "active", "athlete"]),
      preset: z.enum(["aggressive_cut", "moderate_cut", "maintenance", "bulk"]),
    })
    .nullable()
    .optional(),
});

// ---------- Perfil y ajustes ----------
export const profileSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  targetWeightKg: z.number().min(20).max(400).nullable().optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  /** ISO yyyy-mm-dd. */
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  birthYear: z.number().int().min(1900).max(2100).nullable().optional(),
  heightCm: z.number().min(100).max(250).nullable().optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "athlete"]).nullable().optional(),
});

export const userSettingsSchema = z.object({
  streakThreshold: z.number().int().min(0).max(100).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  weights: z
    .object({
      nutrition: z.number().int().min(0).max(100),
      focus: z.number().int().min(0).max(100),
      activity: z.number().int().min(0).max(100),
      study: z.number().int().min(0).max(100),
      habits: z.number().int().min(0).max(100),
      rest: z.number().int().min(0).max(100),
    })
    .optional(),
});

// ---------- Onboarding ----------
export const onboardingSchema = z.object({
  profile: z.object({
    sex: z.enum(["male", "female"]),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthYear: z.number().int().min(1900).max(2100),
    heightCm: z.number().min(100).max(250),
    activityLevel: z.enum(["sedentary", "light", "moderate", "active", "athlete"]),
    weightKg: z.number().min(20).max(400),
    targetWeightKg: z.number().min(20).max(400),
  }),
  goals: nutritionGoalsSchema,
  habits: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(40),
        name: z.string().trim().min(1).max(80),
        kind: habitKind,
        targetValue: z.number().positive().max(100000).nullable(),
        unit: z.string().trim().max(20).nullable(),
        emoji: z.string().trim().max(8).nullable(),
        isKey: z.boolean(),
        category: habitCategory,
      })
    )
    .min(1)
    .max(30),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ---------- Trabajo: objetivos, proyectos, tareas ----------
const shortText = z.string().trim().min(1).max(120);
const longText = z.string().trim().max(2000);

export const objectiveSchema = z.object({
  id: uuid.optional(),
  title: shortText,
  description: longText.optional(),
  emoji: z.string().trim().max(8).optional(),
  targetDate: isoDate.nullable().optional(),
  status: z.enum(["activo", "pausado", "logrado", "archivado"]).optional(),
});

export const projectSchema = z.object({
  id: uuid.optional(),
  objectiveId: uuid.nullable().optional(),
  name: shortText,
  emoji: z.string().trim().max(8).optional(),
  color: z.string().trim().max(20).nullable().optional(),
  status: z.enum(["activo", "pausado", "terminado", "archivado"]).optional(),
});

export const taskSchema = z.object({
  id: uuid.optional(),
  projectId: uuid.nullable().optional(),
  title: shortText,
  description: longText.nullable().optional(),
  status: z.enum(["pendiente", "haciendo", "hecha"]).optional(),
  priority: z.enum(["baja", "media", "alta"]).optional(),
  dueDate: isoDate.nullable().optional(),
  estimateMin: z.number().int().min(0).max(1440).nullable().optional(),
});

export const taskItemSchema = z.object({
  id: uuid.optional(),
  taskId: uuid,
  title: shortText,
  done: z.boolean().optional(),
});

export const pomodoroSchema = z.object({
  taskId: uuid.nullable().optional(),
  minutes: z.number().int().min(1).max(240),
  kind: z.enum(["foco", "pausa"]).optional(),
  date: isoDate.optional(),
});
