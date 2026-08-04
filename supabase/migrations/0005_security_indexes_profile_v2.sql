-- ============================================================
-- 0005 — Seguridad, índices y esquema ampliado (Fase 0)
-- Espejo local de la migración remota "security_indexes_profile_v2"
-- (aplicada en Supabase el 2026-08-04). Idempotente.
-- ============================================================

-- 1) RLS endurecida: habit_entries debe apuntar a un hábito PROPIO.
drop policy if exists habit_entries_owner on habit_entries;
create policy habit_entries_owner on habit_entries
  using (
    user_id = (select auth.uid())
    and exists (select 1 from habits h where h.id = habit_entries.habit_id and h.user_id = (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from habits h where h.id = habit_entries.habit_id and h.user_id = (select auth.uid()))
  );

-- 2) Re-crear políticas de 0001 con (select auth.uid()) — evita re-evaluación por fila.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_settings','nutrition_goals','foods','meals',
    'body_entries','body_photos','habits','daily_logs'
  ] loop
    execute format('drop policy if exists %1$s_owner on %1$s;', t);
    if t = 'profiles' then
      execute format($f$
        create policy %1$s_owner on %1$s
        using (id = (select auth.uid())) with check (id = (select auth.uid()));$f$, t);
    else
      execute format($f$
        create policy %1$s_owner on %1$s
        using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));$f$, t);
    end if;
  end loop;
end $$;

drop policy if exists meal_items_owner on meal_items;
create policy meal_items_owner on meal_items
  using (exists (select 1 from meals m where m.id = meal_items.meal_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from meals m where m.id = meal_items.meal_id and m.user_id = (select auth.uid())));

drop policy if exists habit_schedules_owner on habit_schedules;
create policy habit_schedules_owner on habit_schedules
  using (exists (select 1 from habits h where h.id = habit_schedules.habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from habits h where h.id = habit_schedules.habit_id and h.user_id = (select auth.uid())));

-- 3) Check constraints para datos sanos (el cliente ya no puede meter basura).
alter table daily_logs drop constraint if exists daily_logs_mood_check;
alter table daily_logs add constraint daily_logs_mood_check check (mood is null or mood between 1 and 10);
alter table daily_logs drop constraint if exists daily_logs_energy_check;
alter table daily_logs add constraint daily_logs_energy_check check (energy is null or energy between 1 and 10);
alter table daily_logs drop constraint if exists daily_logs_sleep_quality_check;
alter table daily_logs add constraint daily_logs_sleep_quality_check check (sleep_quality is null or sleep_quality between 1 and 10);
alter table daily_logs drop constraint if exists daily_logs_hunger_check;
alter table daily_logs add constraint daily_logs_hunger_check check (hunger is null or hunger between 1 and 10);
alter table body_entries drop constraint if exists body_entries_weight_check;
alter table body_entries add constraint body_entries_weight_check check (weight_kg is null or weight_kg between 20 and 400);

-- 4) Índices según patrones de acceso reales.
create index if not exists habits_user_active_idx on habits (user_id, active);
create index if not exists habit_schedules_habit_idx on habit_schedules (habit_id);
create index if not exists daily_scores_user_date_desc_idx on daily_scores (user_id, log_date desc);
-- Redundantes con los UNIQUE (mismo par de columnas): fuera.
drop index if exists body_entries_user_id_log_date_idx;
drop index if exists daily_logs_user_id_log_date_idx;
drop index if exists daily_scores_user_date_idx;

-- 5) Perfil ampliado para la calculadora de macros.
alter table profiles add column if not exists sex text check (sex in ('male','female'));
alter table profiles add column if not exists birth_year int check (birth_year between 1900 and 2100);
alter table profiles add column if not exists height_cm numeric check (height_cm between 100 and 250);
alter table profiles add column if not exists activity_level text
  check (activity_level in ('sedentary','light','moderate','active','athlete'));

-- 6) nutrition_goals: modo + inputs del cálculo (para poder recomputar y explicar).
alter table nutrition_goals add column if not exists mode text default 'manual'
  check (mode in ('auto','manual','imported'));
alter table nutrition_goals add column if not exists calc_inputs jsonb;

-- 7) habits: identidad estable (adiós regex sobre nombres).
alter table habits add column if not exists slug text;
alter table habits add column if not exists emoji text;
alter table habits add column if not exists display_order int default 0;
alter table habits add column if not exists is_key boolean default false;

-- 8) Fila de profiles + user_settings al registrarse (usuario nunca huérfano).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
