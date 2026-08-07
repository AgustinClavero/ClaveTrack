-- El onboarding guarda los hábitos con upsert ON CONFLICT (user_id, slug),
-- pero el índice era PARCIAL (WHERE slug IS NOT NULL) y Postgres rechaza un
-- ON CONFLICT que no declare el mismo predicado: "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification". Resultado:
-- ninguna cuenta nueva podía terminar el onboarding.
--
-- Un índice único total se comporta igual en la práctica: por defecto los
-- NULL se consideran distintos entre sí, así que un usuario puede seguir
-- teniendo varios hábitos propios sin slug.
drop index if exists public.habits_user_slug_key;

create unique index habits_user_slug_key on public.habits (user_id, slug);
