-- =========================================================
-- LOJANOVA — Esquema de base de datos para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- TABLA: cantones
-- ---------------------------------------------------------
create table if not exists cantones (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  orden int default 0
);

insert into cantones (nombre, orden) values
  ('Loja', 1), ('Catamayo', 2), ('Saraguro', 3), ('Paltas', 4),
  ('Celica', 5), ('Macará', 6), ('Calvas', 7), ('Gonzanamá', 8),
  ('Espíndola', 9), ('Puyango', 10), ('Zapotillo', 11),
  ('Chaguarpamba', 12), ('Olmedo', 13), ('Pindal', 14),
  ('Quilanga', 15), ('Sozoranga', 16)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------
-- TABLA: categorias
-- ---------------------------------------------------------
create table if not exists categorias (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  slug text not null unique,
  descripcion text,
  imagen_url text,
  icono text,          -- nombre de icono lucide (ej. "coffee")
  orden int default 0,
  created_at timestamptz default now()
);

insert into categorias (nombre, slug, icono, orden) values
  ('Café', 'cafe', 'coffee', 1),
  ('Cacao', 'cacao', 'bean', 2),
  ('Miel', 'miel', 'droplet', 3),
  ('Lácteos', 'lacteos', 'milk', 4),
  ('Frutas', 'frutas', 'apple', 5),
  ('Artesanías', 'artesanias', 'palette', 6),
  ('Textiles', 'textiles', 'shirt', 7),
  ('Cosmética Natural', 'cosmetica-natural', 'sparkles', 8),
  ('Alimentos Procesados', 'alimentos-procesados', 'package', 9),
  ('Bebidas', 'bebidas', 'cup-soda', 10),
  ('Cerámica', 'ceramica', 'amphora', 11),
  ('Otros', 'otros', 'shapes', 12)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------
-- TABLA: emprendedores
-- ---------------------------------------------------------
create table if not exists emprendedores (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  emprendimiento text not null,
  foto_url text,
  historia text,
  canton_id uuid references cantones(id),
  anios_experiencia int,
  telefono text,
  whatsapp text,
  correo text,
  facebook text,
  instagram text,
  ubicacion text,
  lat numeric,
  lng numeric,
  activo boolean default true,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- TABLA: productos
-- ---------------------------------------------------------
create table if not exists productos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  slug text not null unique,
  categoria_id uuid references categorias(id),
  canton_id uuid references cantones(id),
  emprendedor_id uuid references emprendedores(id),
  descripcion_corta text,
  descripcion_larga text,
  historia text,
  proceso_elaboracion text,
  ingredientes text,
  certificaciones text,
  capacidad_produccion text,
  presentacion text,
  peso text,
  disponibilidad text,
  mercados text,
  etiquetas text[] default '{}',
  tipo_emprendimiento text,        -- ej. "Artesanal", "Agroindustrial"
  es_exportacion boolean default false,
  es_artesanal boolean default false,
  imagen_principal_url text,
  destacado boolean default false,
  activo boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_productos_categoria on productos(categoria_id);
create index if not exists idx_productos_canton on productos(canton_id);
create index if not exists idx_productos_emprendedor on productos(emprendedor_id);

-- ---------------------------------------------------------
-- TABLA: producto_imagenes (galería)
-- ---------------------------------------------------------
create table if not exists producto_imagenes (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid references productos(id) on delete cascade,
  imagen_url text not null,
  orden int default 0
);

-- ---------------------------------------------------------
-- TABLA: noticias
-- ---------------------------------------------------------
create table if not exists noticias (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  resumen text,
  contenido text,
  imagen_url text,
  tipo text,                 -- feria | rueda_negocios | capacitacion | convocatoria | evento
  fecha_evento date,
  activo boolean default true,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- TABLA: admins (perfiles con permiso de administración)
-- Vincula auth.users con el panel de administración
-- ---------------------------------------------------------
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  created_at timestamptz default now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table cantones enable row level security;
alter table categorias enable row level security;
alter table emprendedores enable row level security;
alter table productos enable row level security;
alter table producto_imagenes enable row level security;
alter table noticias enable row level security;
alter table admins enable row level security;

-- Lectura pública (la vitrina es pública, sin login)
create policy "lectura publica cantones" on cantones for select using (true);
create policy "lectura publica categorias" on categorias for select using (true);
create policy "lectura publica emprendedores" on emprendedores for select using (true);
create policy "lectura publica productos" on productos for select using (true);
create policy "lectura publica producto_imagenes" on producto_imagenes for select using (true);
create policy "lectura publica noticias" on noticias for select using (true);

-- Escritura solo para usuarios autenticados que estén en la tabla admins
create policy "admin escribe cantones" on cantones for all
  using (auth.uid() in (select id from admins)) with check (auth.uid() in (select id from admins));
create policy "admin escribe categorias" on categorias for all
  using (auth.uid() in (select id from admins)) with check (auth.uid() in (select id from admins));
create policy "admin escribe emprendedores" on emprendedores for all
  using (auth.uid() in (select id from admins)) with check (auth.uid() in (select id from admins));
create policy "admin escribe productos" on productos for all
  using (auth.uid() in (select id from admins)) with check (auth.uid() in (select id from admins));
create policy "admin escribe producto_imagenes" on producto_imagenes for all
  using (auth.uid() in (select id from admins)) with check (auth.uid() in (select id from admins));
create policy "admin escribe noticias" on noticias for all
  using (auth.uid() in (select id from admins)) with check (auth.uid() in (select id from admins));

-- Un admin puede ver su propia fila (necesario para que el panel verifique el rol)
create policy "admin lee su propio perfil" on admins for select
  using (auth.uid() = id);

-- =========================================================
-- STORAGE: buckets para imágenes (ejecutar una sola vez)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('lojanova-imagenes', 'lojanova-imagenes', true)
on conflict (id) do nothing;

create policy "lectura publica de imagenes"
  on storage.objects for select
  using (bucket_id = 'lojanova-imagenes');

create policy "admin sube imagenes"
  on storage.objects for insert
  with check (bucket_id = 'lojanova-imagenes' and auth.uid() in (select id from admins));

create policy "admin borra imagenes"
  on storage.objects for delete
  using (bucket_id = 'lojanova-imagenes' and auth.uid() in (select id from admins));

-- =========================================================
-- Para convertir un usuario en administrador del panel:
-- 1) Crea el usuario en Authentication > Users (email + password)
-- 2) Copia su UUID y ejecuta:
--    insert into admins (id, nombre) values ('UUID-DEL-USUARIO', 'Nombre del admin');
-- =========================================================
