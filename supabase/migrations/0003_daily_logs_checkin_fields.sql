-- ============================================================
-- Espejo local de la migración remota "daily_logs_checkin_fields"
-- (aplicada en Supabase el 2026-08-04). Campos del check-in diario.
-- ============================================================

alter table daily_logs add column if not exists sleep_quality int;
alter table daily_logs add column if not exists hunger int;
alter table daily_logs add column if not exists focus_note text;
alter table daily_logs add column if not exists checkin_done_at timestamptz;
