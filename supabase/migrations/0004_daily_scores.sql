-- ============================================================
-- daily_scores: score de cumplimiento materializado por día.
-- Fuente de verdad para calendario, racha y XP/nivel.
-- Idempotente: create if not exists / drop policy if exists.
-- (Aplicada en Supabase como "daily_scores" el 2026-08-04.)
-- ============================================================

create table if not exists daily_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  total int not null check (total between 0 and 100),
  -- Score por área: {"nutrition": 80, "habits": 100, ...} (solo áreas con datos).
  breakdown jsonb not null default '{}'::jsonb,
  -- Snapshot de los pesos usados al calcular (auditoría / recálculo).
  weights jsonb not null default '{}'::jsonb,
  -- XP ganado ese día (1 XP por punto de score).
  xp int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, log_date)
);

create index if not exists daily_scores_user_date_idx on daily_scores (user_id, log_date);

alter table daily_scores enable row level security;

drop policy if exists daily_scores_owner on daily_scores;
create policy daily_scores_owner on daily_scores
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop trigger if exists trg_daily_scores_updated on daily_scores;
create trigger trg_daily_scores_updated before update on daily_scores
  for each row execute function set_updated_at();
