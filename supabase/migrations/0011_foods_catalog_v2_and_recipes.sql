-- ============================================================
-- 0011 — Catálogo de alimentos v2 + recetas
-- Espejo local de la migración remota.
-- Macros SIEMPRE por 100 g / 100 ml. La "unidad" pasa a ser una
-- forma de contar (1 huevo = 50 g), no una base de cálculo aparte.
-- ============================================================

alter table foods add column if not exists category text not null default 'otros'
  check (category in ('proteinas','carbohidratos','verduras','frutas','grasas','lacteos','condimentos','otros'));
alter table foods add column if not exists brand text;
-- Cómo se cuenta: "huevo", "lata", "pote", "cda"… null = solo gramos.
alter table foods add column if not exists unit_label text;
alter table foods add column if not exists unit_grams numeric check (unit_grams is null or unit_grams > 0);
alter table foods add column if not exists is_favorite boolean not null default false;
alter table foods add column if not exists sugar_g numeric not null default 0;
alter table foods add column if not exists sodium_mg numeric not null default 0;
-- Para los que cambian mucho al cocinarse (arroz, fideos, legumbres).
alter table foods add column if not exists state text check (state in ('crudo','cocido'));

create index if not exists foods_user_fav_idx on foods (user_id, is_favorite) where is_favorite;
create index if not exists foods_user_cat_idx on foods (user_id, category);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  servings numeric not null default 1 check (servings > 0),
  is_favorite boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists recipes_user_idx on recipes (user_id);

create table if not exists recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  food_name text not null,
  quantity numeric not null check (quantity > 0),
  base text not null default '100g' check (base in ('100g','100ml','unidad')),
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz default now()
);
create index if not exists recipe_items_recipe_idx on recipe_items (recipe_id);

alter table recipes enable row level security;
alter table recipe_items enable row level security;

drop policy if exists recipes_owner on recipes;
create policy recipes_owner on recipes
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists recipe_items_owner on recipe_items;
create policy recipe_items_owner on recipe_items
  using (exists (select 1 from recipes r where r.id = recipe_items.recipe_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from recipes r where r.id = recipe_items.recipe_id and r.user_id = (select auth.uid())));

drop trigger if exists trg_recipes_updated on recipes;
create trigger trg_recipes_updated before update on recipes
  for each row execute function set_updated_at();
