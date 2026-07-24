-- =========================================================
-- LOJANOVA — Migración: cuentas de productor
-- Ejecutar DESPUÉS de supabase/schema.sql
-- Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- 1) Vincular cada emprendedor con su cuenta de autenticación
alter table emprendedores
  add column if not exists auth_user_id uuid references auth.users(id) unique;

alter table emprendedores
  add column if not exists estado text not null default 'pendiente'
  check (estado in ('pendiente','aprobado','rechazado'));

-- 2) Al registrarse un productor en registro.html, Supabase Auth crea
--    la fila en auth.users con metadata { rol: 'productor', nombre, emprendimiento }.
--    Este trigger crea automáticamente su fila correspondiente en "emprendedores".
create or replace function public.crear_emprendedor_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'rol', '') = 'productor' then
    update public.emprendedores
    set
      auth_user_id = new.id,
      nombre = coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), nombre, split_part(new.email, '@', 1)),
      emprendimiento = coalesce(nullif(new.raw_user_meta_data ->> 'emprendimiento', ''), emprendimiento, 'Emprendimiento sin nombre'),
      correo = new.email,
      activo = false,
      estado = 'pendiente'
    where lower(correo) = lower(new.email)
      and auth_user_id is null;

    if found then
      return new;
    end if;

    insert into public.emprendedores (auth_user_id, nombre, emprendimiento, correo, activo, estado)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
      coalesce(nullif(new.raw_user_meta_data ->> 'emprendimiento', ''), 'Emprendimiento sin nombre'),
      new.email,
      false,
      'pendiente'
    )
    on conflict (auth_user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists crear_emprendedor_auth_trigger on auth.users;
create trigger crear_emprendedor_auth_trigger
  after insert on auth.users
  for each row execute function crear_emprendedor_auth();

-- 3) RLS: cada productor puede leer, crear y actualizar SOLO su propio perfil,
--    y gestionar SOLO sus propios productos. Se eliminan primero para que
--    puedas ejecutar este archivo más de una vez sin errores de duplicados.
drop policy if exists "productor lee su perfil" on emprendedores;
drop policy if exists "productor crea su perfil" on emprendedores;
drop policy if exists "productor actualiza su perfil" on emprendedores;
drop policy if exists "productor gestiona sus productos" on productos;

create policy "productor lee su perfil" on emprendedores for select
  using (auth.uid() = auth_user_id);

create policy "productor crea su perfil" on emprendedores for insert
  with check (auth.uid() = auth_user_id);

create policy "productor actualiza su perfil" on emprendedores for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "productor gestiona sus productos" on productos for all
  using (emprendedor_id in (select id from emprendedores where auth_user_id = auth.uid()))
  with check (emprendedor_id in (select id from emprendedores where auth_user_id = auth.uid()));
