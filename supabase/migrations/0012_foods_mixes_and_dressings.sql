-- ============================================================
-- 0012 — Mezclas (ensaladas) y aderezos
-- Espejo local de la migración remota.
-- Una mezcla se carga rápido por peso total; el aderezo va SIEMPRE
-- como ítem aparte porque cambia el total más que los vegetales.
-- ============================================================

-- Marca los alimentos que son una mezcla estimada, no un ingrediente.
alter table foods add column if not exists is_mix boolean not null default false;
-- Ofrecible como aderezo rápido al cargar una mezcla.
alter table foods add column if not exists is_dressing boolean not null default false;
-- Cantidad sugerida al elegirlo (g o ml). Para aderezos: una cucharada.
alter table foods add column if not exists default_qty numeric check (default_qty is null or default_qty > 0);

create index if not exists foods_user_dressing_idx on foods (user_id, is_dressing) where is_dressing;

-- Los aderezos que ya existen quedan marcados como tales.
update foods set is_dressing = true, default_qty = coalesce(unit_grams, 15)
  where name in ('Aceite de oliva','Mostaza','Vinagre','Limón','Queso rallado');
