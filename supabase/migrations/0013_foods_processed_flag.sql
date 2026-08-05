-- Marca de ultraprocesado en el catálogo.
-- Alimenta el índice de calidad del Nutrition Score: 1900 kcal de pollo,
-- arroz y verduras no valen lo mismo que 1900 kcal de facturas y gaseosa.
alter table public.foods
  add column if not exists is_processed boolean not null default false;

comment on column public.foods.is_processed is
  'Ultraprocesado (NOVA 4): formulación industrial con azúcares, grasas o aditivos añadidos. Un alimento simplemente cocido, envasado o molido NO cuenta.';

-- Backfill del catálogo base por nombre. Ante la duda, comida real:
-- la miel, el pan o la carne picada son procesados, no ultraprocesados.
update public.foods
set is_processed = true
where lower(name) in (
  'mayonesa', 'mayonesa light', 'mermelada light', 'gelatina light',
  'edulcorante', 'stevia', 'jamón cocido natural', 'proteína en polvo',
  'queso crema común', 'queso crema light'
);

create index if not exists foods_processed_idx on public.foods (user_id, is_processed);
