-- ============================================================
-- ClaveTrack — Migración inicial (Fase 1 / MVP)
-- Tablas base + RLS. Requiere Supabase (auth.users).
-- Convención: toda tabla privada cuelga de user_id y tiene RLS.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Helpers ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
-- PERFIL Y CONFIGURACIÓN
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text default 'America/Argentina/Buenos_Aires',
  weight_unit text default 'kg' check (weight_unit in ('kg','lb')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'light' check (theme in ('light','dark')),
  streak_threshold int default 75 check (streak_threshold between 0 and 100),
  -- Ponderaciones del cumplimiento (0..100, deberían sumar 100).
  w_nutrition int default 30,
  w_tasks int default 25,
  w_activity int default 15,
  w_study int default 10,
  w_habits int default 10,
  w_sleep int default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- NUTRICIÓN
-- ============================================================
create table nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null default current_date,
  kcal int not null,
  protein_g int not null,
  carbs_g int not null,
  fat_g int not null,
  water_ml int not null default 2500,
  source text default 'manual' check (source in ('manual','ai')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on nutrition_goals (user_id, effective_from desc);

create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base text not null default '100g' check (base in ('100g','100ml','unidad')),
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on foods (user_id, name);

create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  meal_type text not null check (meal_type in ('desayuno','almuerzo','merienda','cena','colacion','bebida')),
  eaten_at timestamptz,
  planned boolean default false,
  hunger_before int,
  satiety_after int,
  photo_path text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on meals (user_id, log_date);

create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  food_name text not null,
  quantity numeric not null,
  base text not null default '100g' check (base in ('100g','100ml','unidad')),
  -- Snapshot de macros calculado al registrar (histórico inmutable).
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  created_at timestamptz default now()
);
create index on meal_items (meal_id);

-- ============================================================
-- CUERPO Y PROGRESO
-- ============================================================
create table body_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric,
  waist_cm numeric, chest_cm numeric, hip_cm numeric, arm_cm numeric, leg_cm numeric,
  sleep_h numeric, energy int, bloating int, note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, log_date)
);
create index on body_entries (user_id, log_date);

create table body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  pose text check (pose in ('frente','perfil','espalda')),
  storage_path text not null,
  created_at timestamptz default now()
);
create index on body_photos (user_id, log_date);

-- ============================================================
-- HÁBITOS
-- ============================================================
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('boolean','numeric','duration','weekly')),
  target_value numeric,
  unit text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  frequency text not null default 'daily' check (frequency in ('daily','specific_days','weekly_count')),
  days_of_week int[],           -- 0..6 cuando frequency = specific_days
  weekly_count int              -- cuando frequency = weekly_count
);

create table habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  done boolean default false,
  value numeric,
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);
create index on habit_entries (user_id, log_date);

-- ============================================================
-- REGISTRO DIARIO (cumplimiento)
-- ============================================================
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  score int check (score between 0 and 100),
  water_ml int default 0,
  mood int, energy int, sleep_h numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, log_date)
);
create index on daily_logs (user_id, log_date);

-- ============================================================
-- Triggers updated_at
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_settings','nutrition_goals','foods','meals',
    'body_entries','habits','daily_logs'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ============================================================
-- RLS: cada usuario solo ve/edita lo suyo.
-- ============================================================
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table nutrition_goals enable row level security;
alter table foods enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table body_entries enable row level security;
alter table body_photos enable row level security;
alter table habits enable row level security;
alter table habit_schedules enable row level security;
alter table habit_entries enable row level security;
alter table daily_logs enable row level security;

-- Políticas para tablas con user_id directo.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_settings','nutrition_goals','foods','meals',
    'body_entries','body_photos','habits','habit_entries','daily_logs'
  ] loop
    -- profiles/user_settings usan id/user_id como pk; el resto user_id.
    if t in ('profiles') then
      execute format($f$
        create policy %1$s_owner on %1$s
        using (id = auth.uid()) with check (id = auth.uid());$f$, t);
    else
      execute format($f$
        create policy %1$s_owner on %1$s
        using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
    end if;
  end loop;
end $$;

-- Tablas hijas: heredan la pertenencia a través del padre.
create policy meal_items_owner on meal_items
  using (exists (select 1 from meals m where m.id = meal_items.meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from meals m where m.id = meal_items.meal_id and m.user_id = auth.uid()));

create policy habit_schedules_owner on habit_schedules
  using (exists (select 1 from habits h where h.id = habit_schedules.habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from habits h where h.id = habit_schedules.habit_id and h.user_id = auth.uid()));
