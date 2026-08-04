-- ============================================================
-- 0007 — Storage de fotos de comidas
-- Espejo local de la migración remota "meal_photos_storage".
-- Ruta de archivo: {user_id}/{uuid}.{ext}
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meals', 'meals', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo toca su carpeta (primer segmento del path = su uid).
drop policy if exists meals_photos_select on storage.objects;
create policy meals_photos_select on storage.objects for select
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists meals_photos_insert on storage.objects;
create policy meals_photos_insert on storage.objects for insert
  with check (bucket_id = 'meals' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists meals_photos_update on storage.objects;
create policy meals_photos_update on storage.objects for update
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists meals_photos_delete on storage.objects;
create policy meals_photos_delete on storage.objects for delete
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = (select auth.uid())::text);
