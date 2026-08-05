// ============================================================
// Catálogo base de alimentos.
// REGLA: los macros son SIEMPRE por 100 g (o 100 ml en líquidos).
// `unitLabel` + `unitGrams` definen cómo se cuenta en la vida real
// (1 huevo = 50 g, 1 lata = 120 g), sin cambiar la base del cálculo.
// `state` distingue crudo/cocido en lo que cambia mucho al cocinarse.
// El favorito es el COCIDO: es como llega al plato y como se pesa.
// ============================================================

export type FoodCategory =
  | "proteinas"
  | "carbohidratos"
  | "verduras"
  | "frutas"
  | "grasas"
  | "lacteos"
  | "condimentos"
  | "otros";

export const CATEGORY_META: Record<FoodCategory, { label: string; emoji: string }> = {
  proteinas: { label: "Proteínas", emoji: "🍗" },
  carbohidratos: { label: "Carbohidratos", emoji: "🍚" },
  verduras: { label: "Verduras", emoji: "🥗" },
  frutas: { label: "Frutas", emoji: "🍎" },
  grasas: { label: "Grasas", emoji: "🥜" },
  lacteos: { label: "Lácteos", emoji: "🥛" },
  condimentos: { label: "Condimentos", emoji: "🧂" },
  otros: { label: "Otros", emoji: "🍯" },
};

export interface DefaultFood {
  name: string;
  category: FoodCategory;
  base: "100g" | "100ml";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  /** Ultraprocesado: baja el índice de calidad del día. Ante la duda, false. */
  isProcessed?: boolean;
  /** Cómo se cuenta: "huevo", "lata", "pote", "cda"… */
  unitLabel?: string;
  /** Cuántos gramos pesa una unidad. */
  unitGrams?: number;
  state?: "crudo" | "cocido";
  favorite?: boolean;
  /** Mezcla estimada (ensaladas): se carga por peso total del plato. */
  isMix?: boolean;
  /** Se ofrece como aderezo rápido al cargar una mezcla. */
  isDressing?: boolean;
  /** Cantidad sugerida al elegirlo (g o ml). */
  defaultQty?: number;
}

export const DEFAULT_FOODS: DefaultFood[] = [
  // ---------- 🍗 Proteínas ----------
  // Cocinar concentra: la carne pierde ~25 % de agua y sube todo por 100 g.
  { name: "Pechuga de pollo", category: "proteinas", base: "100g", kcal: 120, protein: 22.5, carbs: 0, fat: 2.6, state: "crudo" },
  { name: "Pechuga de pollo", category: "proteinas", base: "100g", kcal: 165, protein: 31, carbs: 0, fat: 3.6, state: "cocido", favorite: true },
  { name: "Muslo de pollo", category: "proteinas", base: "100g", kcal: 119, protein: 19.6, carbs: 0, fat: 3.9, state: "crudo" },
  { name: "Muslo de pollo", category: "proteinas", base: "100g", kcal: 175, protein: 26, carbs: 0, fat: 7.6, state: "cocido" },
  { name: "Carne vacuna magra", category: "proteinas", base: "100g", kcal: 137, protein: 21.5, carbs: 0, fat: 5, state: "crudo" },
  { name: "Carne vacuna magra", category: "proteinas", base: "100g", kcal: 190, protein: 30, carbs: 0, fat: 7.5, state: "cocido", favorite: true },
  // El atún se pesa escurrido: el líquido no aporta.
  { name: "Atún al natural (escurrido)", category: "proteinas", base: "100g", kcal: 108, protein: 24, carbs: 0, fat: 1, unitLabel: "lata", unitGrams: 120, favorite: true },
  { name: "Atún en aceite (escurrido)", category: "proteinas", base: "100g", kcal: 190, protein: 22, carbs: 0, fat: 11, unitLabel: "lata", unitGrams: 120 },
  { name: "Huevo entero", category: "proteinas", base: "100g", kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, unitLabel: "huevo", unitGrams: 50, favorite: true },
  { name: "Clara de huevo", category: "proteinas", base: "100g", kcal: 52, protein: 11, carbs: 0.7, fat: 0.2, unitLabel: "clara", unitGrams: 33 },
  { name: "Peceto", category: "proteinas", base: "100g", kcal: 131, protein: 22, carbs: 0, fat: 4.5 },
  { name: "Lomo", category: "proteinas", base: "100g", kcal: 143, protein: 22, carbs: 0, fat: 6 },
  { name: "Carne picada común", category: "proteinas", base: "100g", kcal: 250, protein: 17, carbs: 0, fat: 20 },
  { name: "Cerdo magro", category: "proteinas", base: "100g", kcal: 143, protein: 21, carbs: 0, fat: 6 },
  { name: "Merluza", category: "proteinas", base: "100g", kcal: 82, protein: 17.5, carbs: 0, fat: 1 },
  { name: "Salmón", category: "proteinas", base: "100g", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Jamón cocido natural", category: "proteinas", base: "100g", kcal: 110, protein: 19, carbs: 1.5, fat: 3, unitLabel: "feta", unitGrams: 25, isProcessed: true },
  { name: "Proteína en polvo", category: "proteinas", base: "100g", kcal: 400, protein: 80, carbs: 10, fat: 5, unitLabel: "scoop", unitGrams: 30, favorite: true, isProcessed: true },

  // ---------- 🍚 Carbohidratos ----------
  { name: "Arroz blanco", category: "carbohidratos", base: "100g", kcal: 358, protein: 7, carbs: 79, fat: 0.6, fiber: 1.3, state: "crudo" },
  { name: "Arroz blanco", category: "carbohidratos", base: "100g", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, state: "cocido", favorite: true },
  { name: "Arroz integral", category: "carbohidratos", base: "100g", kcal: 350, protein: 7.5, carbs: 74, fat: 2.7, fiber: 3.5, state: "crudo" },
  { name: "Arroz integral", category: "carbohidratos", base: "100g", kcal: 123, protein: 2.6, carbs: 26, fat: 1, fiber: 1.6, state: "cocido" },
  { name: "Fideos", category: "carbohidratos", base: "100g", kcal: 371, protein: 13, carbs: 75, fat: 1.5, fiber: 3.2, state: "crudo" },
  { name: "Fideos", category: "carbohidratos", base: "100g", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8, state: "cocido", favorite: true },
  { name: "Papa", category: "carbohidratos", base: "100g", kcal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, state: "crudo" },
  { name: "Papa hervida", category: "carbohidratos", base: "100g", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8, state: "cocido", favorite: true },
  { name: "Batata", category: "carbohidratos", base: "100g", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, state: "crudo" },
  { name: "Batata hervida", category: "carbohidratos", base: "100g", kcal: 90, protein: 2, carbs: 21, fat: 0.2, fiber: 3.3, state: "cocido", favorite: true },
  { name: "Avena instantánea", category: "carbohidratos", base: "100g", kcal: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, unitLabel: "cda", unitGrams: 15, favorite: true },
  { name: "Harina de avena", category: "carbohidratos", base: "100g", kcal: 380, protein: 14, carbs: 66, fat: 6.5, fiber: 9 },
  { name: "Pan integral", category: "carbohidratos", base: "100g", kcal: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, unitLabel: "rebanada", unitGrams: 32 },
  { name: "Pan francés", category: "carbohidratos", base: "100g", kcal: 270, protein: 9, carbs: 57, fat: 1, fiber: 2.5 },
  { name: "Tortilla integral", category: "carbohidratos", base: "100g", kcal: 297, protein: 9, carbs: 49, fat: 7, fiber: 6, unitLabel: "tortilla", unitGrams: 45 },
  { name: "Lentejas", category: "carbohidratos", base: "100g", kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, state: "cocido" },
  { name: "Garbanzos", category: "carbohidratos", base: "100g", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, state: "cocido" },
  { name: "Porotos", category: "carbohidratos", base: "100g", kcal: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 6.4, state: "cocido" },

  // ---------- 🥗 Verduras ----------
  { name: "Tomate", category: "verduras", base: "100g", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, unitLabel: "unidad", unitGrams: 120, favorite: true },
  { name: "Lechuga", category: "verduras", base: "100g", kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  { name: "Zapallito", category: "verduras", base: "100g", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, unitLabel: "unidad", unitGrams: 150 },
  { name: "Zapallo", category: "verduras", base: "100g", kcal: 26, protein: 1, carbs: 6.5, fat: 0.1, fiber: 0.5 },
  { name: "Brócoli", category: "verduras", base: "100g", kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
  { name: "Coliflor", category: "verduras", base: "100g", kcal: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  { name: "Pepino", category: "verduras", base: "100g", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  { name: "Zanahoria", category: "verduras", base: "100g", kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, unitLabel: "unidad", unitGrams: 70 },
  { name: "Espinaca", category: "verduras", base: "100g", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: "Cebolla", category: "verduras", base: "100g", kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, unitLabel: "unidad", unitGrams: 110 },
  { name: "Morrón rojo", category: "verduras", base: "100g", kcal: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, unitLabel: "unidad", unitGrams: 120 },
  { name: "Morrón verde", category: "verduras", base: "100g", kcal: 20, protein: 0.9, carbs: 4.6, fat: 0.2, fiber: 1.7, unitLabel: "unidad", unitGrams: 120 },
  { name: "Berenjena", category: "verduras", base: "100g", kcal: 25, protein: 1, carbs: 5.9, fat: 0.2, fiber: 3 },
  { name: "Repollo", category: "verduras", base: "100g", kcal: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5 },
  { name: "Acelga", category: "verduras", base: "100g", kcal: 19, protein: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6 },
  { name: "Rúcula", category: "verduras", base: "100g", kcal: 25, protein: 2.6, carbs: 3.7, fat: 0.7, fiber: 1.6 },
  { name: "Apio", category: "verduras", base: "100g", kcal: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6 },
  { name: "Champiñones", category: "verduras", base: "100g", kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  { name: "Choclo", category: "verduras", base: "100g", kcal: 96, protein: 3.4, carbs: 21, fat: 1.5, fiber: 2.4 },

  // Mezclas: para cuando no se pesa ingrediente por ingrediente.
  // Nunca incluyen aderezo: eso se suma aparte porque cambia todo el total.
  { name: "Ensalada mixta (sin aderezo)", category: "verduras", base: "100g", kcal: 30, protein: 1.3, carbs: 6, fat: 0.3, fiber: 1.8, isMix: true, defaultQty: 200, favorite: true },
  { name: "Verduras cocidas (sin aderezo)", category: "verduras", base: "100g", kcal: 45, protein: 2, carbs: 9, fat: 0.5, fiber: 2.5, isMix: true, defaultQty: 200 },
  { name: "Mix de vegetales cocidos con choclo", category: "verduras", base: "100g", kcal: 48, protein: 2, carbs: 10, fat: 0.5, fiber: 2.5, isMix: true, defaultQty: 250, favorite: true },

  // ---------- 🍎 Frutas ----------
  { name: "Banana", category: "frutas", base: "100g", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, unitLabel: "unidad", unitGrams: 120, favorite: true },
  { name: "Manzana", category: "frutas", base: "100g", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, unitLabel: "unidad", unitGrams: 180, favorite: true },
  { name: "Mandarina", category: "frutas", base: "100g", kcal: 53, protein: 0.8, carbs: 13, fat: 0.3, fiber: 1.8, unitLabel: "unidad", unitGrams: 90 },
  { name: "Naranja", category: "frutas", base: "100g", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, unitLabel: "unidad", unitGrams: 130 },
  { name: "Pera", category: "frutas", base: "100g", kcal: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1, unitLabel: "unidad", unitGrams: 170 },
  { name: "Kiwi", category: "frutas", base: "100g", kcal: 61, protein: 1.1, carbs: 15, fat: 0.5, fiber: 3, unitLabel: "unidad", unitGrams: 75 },
  { name: "Frutillas", category: "frutas", base: "100g", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  { name: "Arándanos", category: "frutas", base: "100g", kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
  { name: "Frutos rojos congelados", category: "frutas", base: "100g", kcal: 45, protein: 0.8, carbs: 10, fat: 0.3, fiber: 3 },
  { name: "Ananá", category: "frutas", base: "100g", kcal: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4 },
  { name: "Melón", category: "frutas", base: "100g", kcal: 34, protein: 0.8, carbs: 8, fat: 0.2, fiber: 0.9 },
  { name: "Sandía", category: "frutas", base: "100g", kcal: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4 },
  { name: "Durazno", category: "frutas", base: "100g", kcal: 39, protein: 0.9, carbs: 10, fat: 0.3, fiber: 1.5, unitLabel: "unidad", unitGrams: 150 },
  { name: "Uvas", category: "frutas", base: "100g", kcal: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9 },

  // ---------- 🥜 Grasas saludables ----------
  { name: "Palta", category: "grasas", base: "100g", kcal: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, unitLabel: "unidad", unitGrams: 150, favorite: true },
  { name: "Aceite de oliva", category: "grasas", base: "100ml", kcal: 884, protein: 0, carbs: 0, fat: 100, unitLabel: "cda", unitGrams: 10, favorite: true, isDressing: true, defaultQty: 10 },
  { name: "Mayonesa", category: "grasas", base: "100g", kcal: 680, protein: 1, carbs: 1.5, fat: 75, unitLabel: "cda", unitGrams: 15, isDressing: true, defaultQty: 15, isProcessed: true },
  { name: "Mayonesa light", category: "grasas", base: "100g", kcal: 260, protein: 1, carbs: 9, fat: 24, unitLabel: "cda", unitGrams: 15, isDressing: true, defaultQty: 15, isProcessed: true },
  { name: "Almendras", category: "grasas", base: "100g", kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, unitLabel: "puñado", unitGrams: 25 },
  { name: "Nueces", category: "grasas", base: "100g", kcal: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, unitLabel: "puñado", unitGrams: 25 },
  { name: "Maní", category: "grasas", base: "100g", kcal: 567, protein: 25.8, carbs: 16, fat: 49, fiber: 8.5, unitLabel: "puñado", unitGrams: 25 },
  { name: "Pasta de maní", category: "grasas", base: "100g", kcal: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, unitLabel: "cda", unitGrams: 16 },
  { name: "Semillas de chía", category: "grasas", base: "100g", kcal: 486, protein: 17, carbs: 42, fat: 31, fiber: 34, unitLabel: "cda", unitGrams: 12 },
  { name: "Semillas de lino", category: "grasas", base: "100g", kcal: 534, protein: 18, carbs: 29, fat: 42, fiber: 27, unitLabel: "cda", unitGrams: 10 },

  // ---------- 🥛 Lácteos ----------
  { name: "Leche descremada", category: "lacteos", base: "100ml", kcal: 35, protein: 3.2, carbs: 4.8, fat: 0.2, unitLabel: "vaso", unitGrams: 200, favorite: true },
  { name: "Leche proteica", category: "lacteos", base: "100ml", kcal: 47, protein: 6, carbs: 5, fat: 0.5, unitLabel: "vaso", unitGrams: 200 },
  { name: "Yogur natural", category: "lacteos", base: "100g", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, unitLabel: "pote", unitGrams: 190 },
  { name: "Yogur griego", category: "lacteos", base: "100g", kcal: 97, protein: 9, carbs: 4, fat: 5, unitLabel: "pote", unitGrams: 150 },
  { name: "Yogur proteico", category: "lacteos", base: "100g", kcal: 60, protein: 10, carbs: 4, fat: 0.3, unitLabel: "pote", unitGrams: 150, favorite: true },
  { name: "Queso crema light", category: "lacteos", base: "100g", kcal: 160, protein: 8, carbs: 5, fat: 12, unitLabel: "cda", unitGrams: 15, isProcessed: true },
  { name: "Queso crema común", category: "lacteos", base: "100g", kcal: 342, protein: 6, carbs: 4, fat: 34, unitLabel: "cda", unitGrams: 15, isProcessed: true },
  { name: "Queso port salut light", category: "lacteos", base: "100g", kcal: 230, protein: 24, carbs: 2, fat: 14, unitLabel: "feta", unitGrams: 30 },
  { name: "Queso cremoso", category: "lacteos", base: "100g", kcal: 300, protein: 18, carbs: 3, fat: 24, unitLabel: "feta", unitGrams: 30 },
  { name: "Queso rallado", category: "lacteos", base: "100g", kcal: 431, protein: 38, carbs: 4, fat: 29, unitLabel: "cda", unitGrams: 8 },
  { name: "Mozzarella", category: "lacteos", base: "100g", kcal: 280, protein: 22, carbs: 2, fat: 21 },

  // ---------- 🧂 Condimentos (aportan ~0 kcal) ----------
  { name: "Sal", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Pimienta", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Orégano", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Pimentón", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Ají molido", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Ajo en polvo", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Cebolla en polvo", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Perejil", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Romero", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Tomillo", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Curry", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Comino", category: "condimentos", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { name: "Mostaza", category: "condimentos", base: "100g", kcal: 66, protein: 4, carbs: 6, fat: 3, unitLabel: "cda", unitGrams: 15, isDressing: true, defaultQty: 15 },
  { name: "Vinagre", category: "condimentos", base: "100ml", kcal: 18, protein: 0, carbs: 0.6, fat: 0, unitLabel: "cda", unitGrams: 15, isDressing: true, defaultQty: 15 },
  { name: "Limón", category: "condimentos", base: "100g", kcal: 29, protein: 1.1, carbs: 9, fat: 0.3, unitLabel: "unidad", unitGrams: 60, isDressing: true, defaultQty: 15 },

  // ---------- 🍯 Otros ----------
  { name: "Gelatina light", category: "otros", base: "100g", kcal: 8, protein: 1.2, carbs: 0.6, fat: 0, unitLabel: "pote", unitGrams: 120, isProcessed: true },
  { name: "Cacao 100%", category: "otros", base: "100g", kcal: 228, protein: 20, carbs: 58, fat: 14, fiber: 33, unitLabel: "cda", unitGrams: 6 },
  { name: "Café", category: "otros", base: "100ml", kcal: 2, protein: 0.1, carbs: 0, fat: 0, unitLabel: "taza", unitGrams: 200 },
  { name: "Edulcorante", category: "otros", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0, isProcessed: true },
  { name: "Stevia", category: "otros", base: "100g", kcal: 0, protein: 0, carbs: 0, fat: 0, isProcessed: true },
  { name: "Mermelada light", category: "otros", base: "100g", kcal: 140, protein: 0.4, carbs: 34, fat: 0.1, unitLabel: "cda", unitGrams: 20, isProcessed: true },
  { name: "Miel", category: "otros", base: "100g", kcal: 304, protein: 0.3, carbs: 82, fat: 0, unitLabel: "cda", unitGrams: 21 },
];
