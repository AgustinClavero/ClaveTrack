-- ============================================================
-- 0010 — Suplementos como grupo de hábitos + limpieza
-- Espejo local de la migración remota.
-- Cada suplemento pasa a ser un hábito propio marcable, agrupado
-- por group_key para poder mostrarlos como checklist con su %.
-- ============================================================

-- 1) Agrupador de hábitos (hoy: 'supplements').
alter table habits add column if not exists group_key text;
create index if not exists habits_user_group_idx on habits (user_id, group_key) where group_key is not null;

-- 2) El hábito "Suplementos: a, b, c" se parte en uno por suplemento.
--    Se conserva el histórico del original archivándolo, no borrándolo.
do $$
declare h record;
  item text;
  i int;
  base_order int;
begin
  for h in
    select id, user_id, name, display_order from habits
    where active and name ~* '^suplementos\s*:'
  loop
    i := 0;
    base_order := coalesce(h.display_order, 50);
    foreach item in array string_to_array(regexp_replace(h.name, '^[^:]*:\s*', ''), ',') loop
      item := btrim(item);
      continue when item = '';
      insert into habits (user_id, slug, name, kind, emoji, category, group_key, display_order, active, is_key)
      values (
        h.user_id,
        'supp-' || left(regexp_replace(lower(item), '\s+', '-', 'g'), 30),
        initcap(item),
        'boolean',
        '💊',
        'nutrition',
        'supplements',
        base_order + i,
        true,
        false
      )
      on conflict (user_id, slug) where slug is not null do nothing;
      i := i + 1;
    end loop;
    update habits set active = false where id = h.id;
  end loop;
end $$;

-- 3) Los suplementos sueltos que ya existían entran al grupo.
update habits set group_key = 'supplements', emoji = coalesce(emoji, '💊')
  where slug like 'supp-%' and group_key is null;

-- 4) "Registrar comidas" sale: la propia pantalla de nutrición ya lo refleja.
update habits set active = false where slug = 'comidas' or name ~* '^registrar comida';

-- 5) Emojis pedidos.
update habits set emoji = '🍫' where slug = 'sinazucar' or name ~* 'az[uú]car';
