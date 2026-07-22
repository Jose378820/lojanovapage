-- =========================================================
-- LOJANOVA — Migración: aprobación de productores
-- Ejecutar DESPUÉS de schema.sql y schema_productores.sql
-- Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- 1) Estado de revisión de cada emprendedor
alter table emprendedores
  add column if not exists estado text not null default 'pendiente'
  check (estado in ('pendiente','aprobado','rechazado'));

-- Los emprendedores que ya existían (creados antes de esta migración)
-- quedan aprobados automáticamente para no ocultar contenido que ya
-- estaba publicado. Los nuevos registros SÍ entrarán como 'pendiente'.
update emprendedores set estado = 'aprobado' where estado = 'pendiente';

-- 2) Un productor no puede auto-aprobarse: si intenta cambiar "estado"
--    o "activo" en su propia fila, el trigger lo revierte. Solo las
--    Edge Functions (que usan la service_role key) pueden cambiarlo.
create or replace function proteger_estado_emprendedor()
returns trigger as $$
begin
  if auth.uid() = old.auth_user_id and not (auth.uid() in (select id from admins)) then
    new.estado := old.estado;
    new.activo := old.activo;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists proteger_estado_emprendedor_trigger on emprendedores;
create trigger proteger_estado_emprendedor_trigger
  before update on emprendedores
  for each row execute function proteger_estado_emprendedor();

-- 3) Lectura pública: solo emprendedores APROBADOS y sus productos
drop policy if exists "lectura publica emprendedores" on emprendedores;
create policy "lectura publica emprendedores aprobados" on emprendedores
  for select using (estado = 'aprobado' and activo = true);

drop policy if exists "lectura publica productos" on productos;
create policy "lectura publica productos de aprobados" on productos
  for select using (
    activo = true
    and emprendedor_id in (select id from emprendedores where estado = 'aprobado' and activo = true)
  );

-- Nota: la política "productor lee su perfil" (creada en schema_productores.sql)
-- ya permite que cada productor vea su propia fila sin importar su "estado",
-- para que su panel le muestre si está pendiente, aprobado o rechazado.
