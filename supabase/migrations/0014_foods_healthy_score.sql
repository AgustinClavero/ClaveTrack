-- Valoración nutricional del alimento y agrupación de platos preparados.
-- El healthy_score permite distinguir dos comidas con los mismos macros:
-- 1900 kcal de pollo, arroz y verduras no son 1900 kcal de pizza.
alter table public.foods
  add column if not exists healthy_score smallint,
  add column if not exists dish_group text;

comment on column public.foods.healthy_score is
  'Calidad nutricional 0..100. Alimento simple sin puntuar = null (no penaliza).';
comment on column public.foods.dish_group is
  'Subgrupo de platos preparados (Pizzas, Bowls, Tartas...). Solo para category = preparadas.';

alter table public.foods
  add constraint foods_healthy_score_range
  check (healthy_score is null or (healthy_score between 0 and 100));
