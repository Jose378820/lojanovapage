-- =========================================================
-- LOJANOVA — Restringir subida de imágenes a su propia carpeta
-- Ejecutar en Supabase Dashboard > SQL Editor > New query
-- =========================================================

drop policy if exists "productor sube imagenes" on storage.objects;

create policy "productor sube imagenes" on storage.objects
  for insert
  with check (
    bucket_id = 'lojanova-imagenes'
    and (storage.foldername(name))[1] = 'productores'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "productor actualiza sus imagenes" on storage.objects
  for update
  using (
    bucket_id = 'lojanova-imagenes'
    and (storage.foldername(name))[1] = 'productores'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
