// ============================================================
// Esquemas Zod por módulo. TODA Server Action valida su entrada
// con safeParse antes de tocar la DB. La fecha del "día" NUNCA
// viene del cliente: se deriva en servidor (profiles.timezone).
// ============================================================

import { z } from "zod";

// ---------- Primitivas ----------
export const uuid = z.string().uuid();
const scale10 = z.number().int().min(1).max(10);

// ---------- Hábitos ----------
export const toggleHabitSchema = z.object({
  habitId: uuid,
  done: z.boolean(),
});

export const habitValueSchema = z.object({
  habitId: uuid,
  value: z.number().min(0).max(100000),
});

export const habitKind = z.enum(["boolean", "numeric", "duration", "weekly"]);

export const habitUpsertSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(80),
  kind: habitKind,
  targetValue: z.number().positive().max(100000).nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  emoji: z.string().trim().max(8).nullable().optional(),
  isKey: z.boolean().optional(),
});

// ---------- Check-in ----------
export const checkinSchema = z.object({
  weightKg: z.number().min(20).max(400).nullable().optional(),
  mood: scale10.optional(),
  energy: scale10.optional(),
  sleepQuality: scale10.optional(),
  hunger: scale10.optional(),
  focusNote: z.string().trim().max(200).optional(),
});

// ---------- Peso ----------
export const weightSchema = z.object({
  kg: z.number().min(20).max(400),
});

// ---------- Nutrición ----------
export const foodBase = z.enum(["100g", "100ml", "unidad"]);
export const mealType = z.enum(["desayuno", "almuerzo", "merienda", "cena", "colacion", "bebida"]);

export const foodCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  base: foodBase,
  kcal: z.number().min(0).max(9000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
  fiberG: z.number().min(0).max(1000).optional().default(0),
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
  items: z.array(z.discriminatedUnion("kind", [mealItemFromFood, mealItemManual])).min(1).max(30),
});
export type LogMealInput = z.infer<typeof logMealSchema>;

export const nutritionGoalsSchema = z.object({
  kcal: z.number().int().min(800).max(8000),
  proteinG: z.number().int().min(0).max(500),
  carbsG: z.number().int().min(0).max(1000),
  fatG: z.number().int().min(0).max(400),
  waterMl: z.number().int().min(500).max(8000),
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
      })
    )
    .min(1)
    .max(30),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
