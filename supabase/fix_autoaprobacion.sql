-- =========================================================
-- LOJANOVA — Seguridad: evitar que un productor se auto-apruebe
-- Ejecutar en Supabase Dashboard > SQL Editor > New query
--
-- Problema: la política RLS de UPDATE en "emprendedores" solo valida
-- que la fila sea del propio usuario, pero no restringe qué columnas
-- puede cambiar. Un productor podría llamar directo a la API REST
-- de Supabase (sin pasar por la web) y poner activo=true, estado='aprobado'
-- saltándose la revisión del admin.
-- =========================================================

create or replace function public.bloquear_autoaprobacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si quien edita NO es admin, se ignoran los cambios a activo/estado
  if auth.uid() is null or auth.uid() not in (select id from admins) then
    new.activo := old.activo;
    new.estado := old.estado;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloquear_autoaprobacion on public.emprendedores;
create trigger trg_bloquear_autoaprobacion
  before update on public.emprendedores
  for each row execute function public.bloquear_autoaprobacion();
