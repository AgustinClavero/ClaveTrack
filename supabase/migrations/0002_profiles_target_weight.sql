-- ============================================================
-- Espejo local de la migración remota "profiles_target_weight"
-- (aplicada en Supabase el 2026-08-04). Peso objetivo del usuario.
-- ============================================================

alter table profiles add column if not exists target_weight_kg numeric;
