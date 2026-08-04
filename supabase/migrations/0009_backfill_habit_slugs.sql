-- ============================================================
-- 0009 — Backfill de slugs y categorías de hábitos
-- Espejo local de lo aplicado en Supabase. Los hábitos creados
-- antes de que existiera `slug` lo tenían en null, y sin él la
-- app no podía relacionarlos (p. ej. pasos → hábito Caminar).
-- ============================================================

update habits set slug = case
  when name ~* '^beber agua|^agua' then 'agua'
  when name ~* 'registrar comida' then 'comidas'
  when name ~* 'planificar' then 'planificar'
  when name ~* 'suplement' then 'suplementos'
  when name ~* '^caminar|pasos' then 'caminar'
  when name ~* '^entrenar' then 'entrenar'
  when name ~* '^dormir|sue.o' then 'dormir'
  when name ~* '^leer' then 'leer'
  when name ~* 'estirar' then 'estirar'
  when name ~* 'meditar' then 'meditar'
  when name ~* 'az[uú]car' then 'sinazucar'
  else null
end
where slug is null;

update habits set category = 'activity' where slug in ('caminar','entrenar','estirar');
update habits set category = 'nutrition' where slug in ('agua','comidas','suplementos','sinazucar');
update habits set category = 'mind' where slug in ('meditar');
update habits set category = 'routine' where slug in ('planificar','dormir','leer');
