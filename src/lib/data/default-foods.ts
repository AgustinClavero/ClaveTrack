// ============================================================
// Catálogo base de alimentos (por 100 g / 100 ml / unidad).
// Se clona al usuario en el onboarding o a demanda (seedDefaultFoods).
// Valores de referencia estándar, redondeados.
// ============================================================

export interface DefaultFood {
  name: string;
  base: "100g" | "100ml" | "unidad";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export const DEFAULT_FOODS: DefaultFood[] = [
  // Proteínas
  { name: "Pechuga de pollo", base: "100g", kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 },
  { name: "Carne magra (nalga)", base: "100g", kcal: 137, protein: 21.5, carbs: 0, fat: 5 },
  { name: "Carne picada común", base: "100g", kcal: 250, protein: 17, carbs: 0, fat: 20 },
  { name: "Merluza", base: "100g", kcal: 82, protein: 17.5, carbs: 0, fat: 1 },
  { name: "Atún al natural (lata)", base: "100g", kcal: 108, protein: 24, carbs: 0, fat: 1 },
  { name: "Huevo", base: "unidad", kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: "Clara de huevo", base: "unidad", kcal: 17, protein: 3.6, carbs: 0.2, fat: 0.1 },
  { name: "Jamón cocido natural", base: "100g", kcal: 110, protein: 19, carbs: 1.5, fat: 3 },
  { name: "Queso port salut light", base: "100g", kcal: 230, protein: 24, carbs: 2, fat: 14 },
  { name: "Yogur proteico", base: "unidad", kcal: 90, protein: 15, carbs: 6, fat: 0.5 },
  { name: "Whey protein (scoop)", base: "unidad", kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  // Carbohidratos
  { name: "Arroz blanco (cocido)", base: "100g", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: "Fideos (cocidos)", base: "100g", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8 },
  { name: "Papa (cocida)", base: "100g", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8 },
  { name: "Batata (cocida)", base: "100g", kcal: 90, protein: 2, carbs: 21, fat: 0.2, fiber: 3.3 },
  { name: "Avena", base: "100g", kcal: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6 },
  { name: "Pan integral (rebanada)", base: "unidad", kcal: 80, protein: 4, carbs: 14, fat: 1, fiber: 2 },
  { name: "Pan francés", base: "100g", kcal: 270, protein: 9, carbs: 57, fat: 1, fiber: 2.5 },
  { name: "Tortilla de arroz", base: "unidad", kcal: 35, protein: 0.7, carbs: 7.5, fat: 0.3 },
  { name: "Lentejas (cocidas)", base: "100g", kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
  { name: "Garbanzos (cocidos)", base: "100g", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6 },
  // Grasas
  { name: "Palta", base: "100g", kcal: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: "Aceite de oliva", base: "100ml", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Maní", base: "100g", kcal: 567, protein: 25.8, carbs: 16, fat: 49, fiber: 8.5 },
  { name: "Mantequilla de maní", base: "100g", kcal: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
  { name: "Almendras", base: "100g", kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  // Lácteos y bebidas
  { name: "Leche descremada", base: "100ml", kcal: 35, protein: 3.2, carbs: 4.8, fat: 0.2 },
  { name: "Yogur natural", base: "100g", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { name: "Queso cremoso", base: "100g", kcal: 300, protein: 18, carbs: 3, fat: 24 },
  // Frutas y verduras
  { name: "Banana", base: "unidad", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
  { name: "Manzana", base: "unidad", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { name: "Naranja", base: "unidad", kcal: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1 },
  { name: "Frutillas", base: "100g", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  { name: "Tomate", base: "100g", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  { name: "Lechuga", base: "100g", kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  { name: "Zanahoria", base: "100g", kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  { name: "Brócoli", base: "100g", kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
  { name: "Zapallo", base: "100g", kcal: 26, protein: 1, carbs: 6.5, fat: 0.1, fiber: 0.5 },
];
