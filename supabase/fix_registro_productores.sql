-- =========================================================
-- LOJANOVA — Fix para registro/login de productores
-- Ejecutar en Supabase Dashboard > SQL Editor > New query
-- =========================================================

alter table public.emprendedores enable row level security;
alter table public.productos enable row level security;

alter table public.emprendedores
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

alter table public.emprendedores
  add column if not exists estado text not null default 'pendiente'
  check (estado in ('pendiente','aprobado','rechazado'));

create or replace function public.crear_emprendedor_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'rol', '') = 'productor' then
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
  for each row execute function public.crear_emprendedor_auth();

drop policy if exists "productor lee su perfil" on public.emprendedores;
drop policy if exists "productor crea su perfil" on public.emprendedores;
drop policy if exists "productor actualiza su perfil" on public.emprendedores;
drop policy if exists "productor gestiona sus productos" on public.productos;
drop policy if exists "productor crea sus productos" on public.productos;
drop policy if exists "productor actualiza sus productos" on public.productos;
drop policy if exists "productor elimina sus productos" on public.productos;

create policy "productor lee su perfil" on public.emprendedores
  for select
  using (auth.uid() = auth_user_id);

create policy "productor crea su perfil" on public.emprendedores
  for insert
  with check (auth.uid() = auth_user_id);

create policy "productor actualiza su perfil" on public.emprendedores
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "productor crea sus productos" on public.productos
  for insert
  with check (
    emprendedor_id in (
      select id from public.emprendedores where auth_user_id = auth.uid()
    )
  );

create policy "productor actualiza sus productos" on public.productos
  for update
  using (
    emprendedor_id in (
      select id from public.emprendedores where auth_user_id = auth.uid()
    )
  )
  with check (
    emprendedor_id in (
      select id from public.emprendedores where auth_user_id = auth.uid()
    )
  );

create policy "productor elimina sus productos" on public.productos
  for delete
  using (
    emprendedor_id in (
      select id from public.emprendedores where auth_user_id = auth.uid()
    )
  );
