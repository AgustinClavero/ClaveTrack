-- La categoría de platos preparados faltaba en el CHECK de foods.category:
-- sin esto el catálogo no se puede sembrar.
alter table public.foods drop constraint if exists foods_category_check;

alter table public.foods
  add constraint foods_category_check check (category = any (array[
    'proteinas', 'carbohidratos', 'verduras', 'frutas',
    'grasas', 'lacteos', 'condimentos', 'preparadas', 'otros'
  ]));
