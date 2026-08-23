-- Analíticas robustas de Lojanova.
-- No borra ni actualiza eventos históricos: solo mejora índices, validación y agregaciones.

create index if not exists idx_analytics_tipo_fecha
  on public.analytics_eventos (tipo, creado_en desc);
create index if not exists idx_analytics_session_fecha
  on public.analytics_eventos (session_id, creado_en desc);

-- Conserva la inserción pública necesaria para medir visitas, pero rechaza payloads anómalos.
drop policy if exists "insertar eventos publico" on public.analytics_eventos;
create policy "insertar eventos publico"
  on public.analytics_eventos
  for insert
  to anon, authenticated
  with check (
    char_length(session_id) between 8 and 200
    and char_length(pagina) between 1 and 500
    and tipo in ('pageview', 'engagement', 'click', 'busqueda', 'filtro', 'heartbeat')
    and pg_column_size(coalesce(metadata, '{}'::jsonb)) <= 4096
  );

grant insert on public.analytics_eventos to anon, authenticated;
grant select on public.analytics_eventos to authenticated;
revoke select on public.analytics_eventos from anon;

-- Todos los cortes horarios usan la hora oficial de Ecuador continental.
create or replace view public.vista_resumen_analiticas
with (security_invoker = true) as
select
  count(*) filter (
    where tipo = 'pageview' and creado_en >= now() - interval '30 days'
  )::bigint as visitas_30d,
  count(distinct session_id) filter (
    where tipo = 'pageview' and creado_en >= now() - interval '30 days'
  )::bigint as visitantes_unicos_30d,
  count(*) filter (
    where tipo = 'pageview'
      and timezone('America/Guayaquil', creado_en)::date = timezone('America/Guayaquil', now())::date
  )::bigint as visitas_hoy,
  max(creado_en) filter (where tipo = 'pageview') as ultima_visita
from public.analytics_eventos;

create or replace view public.vista_visitas_diarias
with (security_invoker = true) as
select
  timezone('America/Guayaquil', creado_en)::date as dia,
  count(*)::bigint as visitas,
  count(distinct session_id)::bigint as visitantes_unicos
from public.analytics_eventos
where tipo = 'pageview' and creado_en >= now() - interval '30 days'
group by timezone('America/Guayaquil', creado_en)::date
order by dia;

create or replace view public.vista_horas_pico
with (security_invoker = true) as
select
  extract(hour from timezone('America/Guayaquil', creado_en))::int as hora,
  count(*)::bigint as visitas
from public.analytics_eventos
where tipo = 'pageview' and creado_en >= now() - interval '30 days'
group by extract(hour from timezone('America/Guayaquil', creado_en))::int
order by hora;

create or replace view public.vista_paises
with (security_invoker = true) as
select coalesce(pais, 'Desconocido') as pais, count(distinct session_id)::bigint as visitantes
from public.analytics_eventos
where tipo = 'pageview' and creado_en >= now() - interval '30 days'
group by coalesce(pais, 'Desconocido')
order by visitantes desc;

create or replace view public.vista_ciudades
with (security_invoker = true) as
select coalesce(ciudad, 'Desconocida') as ciudad, coalesce(pais, '') as pais,
       count(distinct session_id)::bigint as visitantes
from public.analytics_eventos
where tipo = 'pageview' and creado_en >= now() - interval '30 days' and ciudad is not null
group by coalesce(ciudad, 'Desconocida'), coalesce(pais, '')
order by visitantes desc
limit 15;

create or replace view public.vista_origenes_trafico
with (security_invoker = true) as
select
  case
    when nullif(utm_source, '') is not null then utm_source
    when nullif(referrer_dominio, '') is null then 'Directo'
    else referrer_dominio
  end as origen,
  count(*)::bigint as visitas
from public.analytics_eventos
where tipo = 'pageview' and creado_en >= now() - interval '30 days'
group by 1
order by visitas desc;

create or replace view public.vista_productos_mas_vistos
with (security_invoker = true) as
select
  split_part(split_part(pagina, 'slug=', 2), '&', 1) as slug,
  count(*)::bigint as vistas
from public.analytics_eventos
where tipo = 'pageview'
  and pagina like '%producto.html?slug=%'
  and creado_en >= now() - interval '30 days'
group by 1
order by vistas desc
limit 15;

create or replace view public.vista_tiempo_por_pagina
with (security_invoker = true) as
with eventos_validos as (
  select
    session_id,
    pagina,
    case when metadata->>'tiempo_en_pagina' ~ '^[0-9]+([.][0-9]+)?$'
      then least((metadata->>'tiempo_en_pagina')::numeric, 1800) end as segundos,
    case when metadata->>'profundidad_scroll' ~ '^[0-9]+([.][0-9]+)?$'
      then least((metadata->>'profundidad_scroll')::numeric, 100) end as scroll
  from public.analytics_eventos
  where tipo = 'engagement' and creado_en >= now() - interval '30 days'
), por_sesion_pagina as (
  select session_id, pagina, max(segundos) as segundos, max(scroll) as scroll
  from eventos_validos
  group by session_id, pagina
)
select
  pagina,
  round(avg(segundos)) as segundos_promedio,
  round(avg(scroll)) as scroll_promedio_pct,
  count(*)::bigint as sesiones
from por_sesion_pagina
group by pagina
order by sesiones desc
limit 15;

create or replace view public.vista_duracion_sesiones
with (security_invoker = true) as
with rango as (
  select session_id, min(creado_en) as inicio, max(creado_en) as fin
  from public.analytics_eventos
  where creado_en >= now() - interval '30 days'
  group by session_id
), engagement_pagina as (
  select session_id, pagina,
    max(case
      when metadata->>'tiempo_en_pagina' ~ '^[0-9]+([.][0-9]+)?$'
      then least((metadata->>'tiempo_en_pagina')::numeric, 1800)
    end) as segundos
  from public.analytics_eventos
  where tipo = 'engagement'
    and creado_en >= now() - interval '30 days'
  group by session_id, pagina
), engagement_sesion as (
  select session_id, sum(segundos) as segundos from engagement_pagina group by session_id
)
select r.session_id, r.inicio, r.fin,
  coalesce(e.segundos, extract(epoch from (r.fin - r.inicio))) as duracion_segundos
from rango r
left join engagement_sesion e using (session_id);

create or replace view public.vista_tasa_rebote
with (security_invoker = true) as
with sesiones as (
  select
    session_id,
    count(*) filter (where tipo = 'pageview') as paginas_vistas,
    bool_or(tipo = 'engagement' and (
      case when metadata->>'tiempo_en_pagina' ~ '^[0-9]+([.][0-9]+)?$'
        then (metadata->>'tiempo_en_pagina')::numeric >= 10 else false end
      or case when metadata->>'profundidad_scroll' ~ '^[0-9]+([.][0-9]+)?$'
        then (metadata->>'profundidad_scroll')::numeric >= 50 else false end
    )) as tuvo_interaccion
  from public.analytics_eventos
  where creado_en >= now() - interval '30 days'
  group by session_id
  having count(*) filter (where tipo = 'pageview') > 0
)
select
  count(*) filter (where paginas_vistas = 1 and not coalesce(tuvo_interaccion, false))::bigint as sesiones_rebote,
  count(*)::bigint as sesiones_totales,
  round(100.0 * count(*) filter (where paginas_vistas = 1 and not coalesce(tuvo_interaccion, false)) / nullif(count(*), 0), 1) as tasa_rebote_pct
from sesiones;

revoke all on public.vista_resumen_analiticas from anon;
grant select on public.vista_resumen_analiticas to authenticated;

-- Refuerza nuevamente todas las vistas involucradas sin tocar sus datos base.
do $$
declare nombre text;
begin
  foreach nombre in array array[
    'vista_resumen_analiticas','vista_visitas_diarias','vista_horas_pico','vista_paises',
    'vista_ciudades','vista_origenes_trafico','vista_productos_mas_vistos',
    'vista_tiempo_por_pagina','vista_duracion_sesiones','vista_tasa_rebote'
  ] loop
    execute format('alter view public.%I set (security_invoker = true)', nombre);
    execute format('revoke all on public.%I from anon', nombre);
    execute format('grant select on public.%I to authenticated', nombre);
  end loop;
end $$;
