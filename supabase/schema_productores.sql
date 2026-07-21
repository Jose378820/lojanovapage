-- =========================================================
-- LOJANOVA — Migración: cuentas de productor
-- Ejecutar DESPUÉS de supabase/schema.sql
-- Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- 1) Vincular cada emprendedor con su cuenta de autenticación
alter table emprendedores
  add column if not exists auth_user_id uuid references auth.users(id) unique;

-- 2) Al registrarse un productor en registro.html, Supabase Auth crea
--    la fila en auth.users con metadata { rol: 'productor', nombre, emprendimiento }.
--    Este trigger crea automáticamente su fila correspondiente en "emprendedores".
create or replace function crear_emprendedor_auth()
returns trigger as $$
begin
  if (new.raw_user_meta_data ->> 'rol') = 'productor' then
    insert into emprendedores (auth_user_id, nombre, emprendimiento, correo, activo)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nombre', ''),
      coalesce(new.raw_user_meta_data ->> 'emprendimiento', ''),
      new.email,
      true
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists crear_emprendedor_auth_trigger on auth.users;
create trigger crear_emprendedor_auth_trigger
  after insert on auth.users
  for each row execute function crear_emprendedor_auth();

-- 3) RLS: cada productor puede leer y actualizar SOLO su propio perfil,
--    y gestionar SOLO sus propios productos (las políticas de admins y
--    lectura pública de schema.sql se mantienen intactas; estas se suman).
create policy "productor lee su perfil" on emprendedores for select
  using (auth.uid() = auth_user_id);

create policy "productor actualiza su perfil" on emprendedores for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "productor gestiona sus productos" on productos for all
  using (emprendedor_id in (select id from emprendedores where auth_user_id = auth.uid()))
  with check (emprendedor_id in (select id from emprendedores where auth_user_id = auth.uid()));
