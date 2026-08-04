import type { Food, Macros, Meal, MealItem } from "@/types";

const BASE_QTY: Record<Food["base"], number> = {
  "100g": 100,
  "100ml": 100,
  unidad: 1,
};

const EMPTY: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/**
 * Calcula los macros de una cantidad de un alimento.
 * factor = cantidad / base_de_referencia; macros = macros_alimento * factor.
 */
export function macrosForQuantity(food: Food, quantity: number): Macros {
  const factor = quantity / BASE_QTY[food.base];
  return {
    kcal: round(food.macros.kcal * factor),
    protein: round(food.macros.protein * factor),
    carbs: round(food.macros.carbs * factor),
    fat: round(food.macros.fat * factor),
    fiber: round((food.macros.fiber ?? 0) * factor),
  };
}

/** Construye un MealItem con snapshot de macros al momento de registrar. */
export function buildMealItem(id: string, food: Food, quantity: number): MealItem {
  return {
    id,
    foodId: food.id,
    foodName: food.name,
    quantity,
    base: food.base,
    macros: macrosForQuantity(food, quantity),
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: (acc.fiber ?? 0) + (m.fiber ?? 0),
    }),
    { ...EMPTY }
  );
}

/** Total de una comida. */
export function mealTotals(meal: Meal): Macros {
  return sumMacros(meal.items.map((i) => i.macros));
}

/** Total del día a partir de varias comidas. */
export function dayTotals(meals: Meal[]): Macros {
  return sumMacros(meals.map(mealTotals));
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
