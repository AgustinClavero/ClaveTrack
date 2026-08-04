-- ============================================================
-- 0008 — Categorías de hábito y módulo de actividad
-- Espejo local de la migración remota "habit_categories_and_workouts".
-- Cada hábito vive en una página temática; las sesiones de
-- entrenamiento se registran aparte con calorías estimadas.
-- ============================================================

-- 1) Categoría del hábito: define en qué página se registra.
alter table habits add column if not exists category text not null default 'routine'
  check (category in ('nutrition','activity','routine','mind'));

-- Reclasificar lo que ya existe según su slug/nombre.
update habits set category = 'nutrition'
  where category = 'routine'
    and (slug in ('agua','comidas','sinazucar') or slug like 'supp-%'
         or name ~* 'agua|comida|az[uú]car|suplement|creatina|vitamina|omega|proteina');
update habits set category = 'activity'
  where category = 'routine'
    and (slug in ('caminar','entrenar','correr') or name ~* 'camin|entren|correr|gimnasio|pasos|bici');

-- 2) Fecha de nacimiento completa (el año solo no da la edad exacta).
alter table profiles add column if not exists birth_date date;
update profiles set birth_date = make_date(birth_year, 1, 1)
  where birth_date is null and birth_year is not null;

-- 3) Sesiones de actividad.
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  kind text not null check (kind in (
    'caminata','running','gimnasio','ciclismo','futbol','natacion','boxeo','yoga','otro'
  )),
  minutes int not null check (minutes between 1 and 600),
  intensity text not null default 'moderada' check (intensity in ('suave','moderada','fuerte')),
  distance_km numeric check (distance_km is null or distance_km between 0 and 500),
  steps int check (steps is null or steps between 0 and 200000),
  -- Estimación calculada en el servidor con METs y el peso del usuario.
  kcal int not null default 0 check (kcal between 0 and 10000),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists workouts_user_date_idx on workouts (user_id, log_date desc);

alter table workouts enable row level security;
drop policy if exists workouts_owner on workouts;
create policy workouts_owner on workouts
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop trigger if exists trg_workouts_updated on workouts;
create trigger trg_workouts_updated before update on workouts
  for each row execute function set_updated_at();
