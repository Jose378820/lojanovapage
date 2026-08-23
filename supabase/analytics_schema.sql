-- =========================================================
-- LOJANOVA — Analytics de visitas
-- Ejecutar en Supabase Dashboard > SQL Editor > New query
-- =========================================================

create table if not exists analytics_eventos (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  pagina text not null,
  tipo text not null default 'pageview', -- pageview | heartbeat
  referrer text,
  dispositivo text,      -- mobile | desktop | tablet
  navegador text,
  creado_en timestamptz default now()
);

create index if not exists idx_analytics_session on analytics_eventos(session_id);
create index if not exists idx_analytics_fecha on analytics_eventos(creado_en);
create index if not exists idx_analytics_pagina on analytics_eventos(pagina);

alter table analytics_eventos enable row level security;

-- Cualquiera puede insertar (registrar su propia visita), nadie puede leer sin ser admin
create policy "insertar eventos publico" on analytics_eventos
  for insert with check (true);

create policy "admin lee eventos" on analytics_eventos
  for select using (auth.uid() in (select id from admins));

-- ---------------------------------------------------------
-- VISTAS de agregación (usadas por el dashboard)
-- ---------------------------------------------------------

-- Visitas y visitantes únicos por día (últimos 30 días)
create or replace view vista_visitas_diarias with (security_invoker = true) as
select
  date(creado_en) as dia,
  count(*) filter (where tipo = 'pageview') as visitas,
  count(distinct session_id) as visitantes_unicos
from analytics_eventos
where creado_en > now() - interval '30 days'
group by date(creado_en)
order by dia;

-- Páginas más visitadas (últimos 30 días)
create or replace view vista_paginas_top with (security_invoker = true) as
select pagina, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by pagina
order by visitas desc
limit 10;

-- Distribución por hora del día (últimos 30 días) — para ver patrones de conexión
create or replace view vista_horas_pico with (security_invoker = true) as
select extract(hour from creado_en)::int as hora, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by hora
order by hora;

-- Dispositivos (últimos 30 días)
create or replace view vista_dispositivos with (security_invoker = true) as
select coalesce(dispositivo, 'desconocido') as dispositivo, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by dispositivo;

-- Duración de sesión estimada (última actividad - primera actividad por sesión)
create or replace view vista_duracion_sesiones with (security_invoker = true) as
select
  session_id,
  min(creado_en) as inicio,
  max(creado_en) as fin,
  extract(epoch from (max(creado_en) - min(creado_en))) as duracion_segundos
from analytics_eventos
where creado_en > now() - interval '30 days'
group by session_id;

-- Las vistas respetan el RLS de analytics_eventos y solo se conceden a usuarios autenticados.
revoke all on vista_visitas_diarias, vista_paginas_top, vista_horas_pico, vista_dispositivos, vista_duracion_sesiones from anon;
grant select on vista_visitas_diarias, vista_paginas_top, vista_horas_pico, vista_dispositivos, vista_duracion_sesiones to authenticated;
