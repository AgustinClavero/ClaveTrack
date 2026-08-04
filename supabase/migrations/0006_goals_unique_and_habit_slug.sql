-- ============================================================
-- 0006 — Claves únicas para upserts idempotentes (Fase 0)
-- Espejo local de la migración remota "goals_unique_and_habit_slug".
-- ============================================================

-- Una sola versión de objetivos por fecha de vigencia (habilita upsert idempotente).
delete from nutrition_goals a using nutrition_goals b
  where a.user_id = b.user_id and a.effective_from = b.effective_from and a.ctid < b.ctid;
alter table nutrition_goals drop constraint if exists nutrition_goals_user_effective_key;
alter table nutrition_goals add constraint nutrition_goals_user_effective_key unique (user_id, effective_from);

-- Un hábito por slug y usuario (habilita upsert idempotente en el onboarding).
create unique index if not exists habits_user_slug_key on habits (user_id, slug) where slug is not null;
