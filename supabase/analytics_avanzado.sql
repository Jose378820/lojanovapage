-- =========================================================
-- LOJANOVA — Analytics avanzado (ejecutar DESPUÉS de analytics_schema.sql)
-- Agrega geolocalización, UTM, tiempo en página, scroll, clics,
-- búsquedas, filtros y vistas por producto.
-- =========================================================

alter table analytics_eventos add column if not exists referrer_dominio text;
alter table analytics_eventos add column if not exists so text;
alter table analytics_eventos add column if not exists idioma text;
alter table analytics_eventos add column if not exists resolucion text;
alter table analytics_eventos add column if not exists conexion text;
alter table analytics_eventos add column if not exists pais text;
alter table analytics_eventos add column if not exists ciudad text;
alter table analytics_eventos add column if not exists utm_source text;
alter table analytics_eventos add column if not exists utm_medium text;
alter table analytics_eventos add column if not exists utm_campaign text;
alter table analytics_eventos add column if not exists metadata jsonb default '{}'::jsonb;

-- tipo ahora puede ser: pageview | heartbeat | engagement | click | busqueda | filtro

create index if not exists idx_analytics_tipo on analytics_eventos(tipo);
create index if not exists idx_analytics_pais on analytics_eventos(pais);

-- ---------------------------------------------------------
-- VISTAS adicionales
-- ---------------------------------------------------------

create or replace view vista_paises as
select coalesce(pais, 'Desconocido') as pais, count(distinct session_id) as visitantes
from analytics_eventos
where creado_en > now() - interval '30 days'
group by pais
order by visitantes desc;

create or replace view vista_ciudades as
select coalesce(ciudad, 'Desconocida') as ciudad, coalesce(pais,'') as pais, count(distinct session_id) as visitantes
from analytics_eventos
where creado_en > now() - interval '30 days' and ciudad is not null
group by ciudad, pais
order by visitantes desc
limit 15;

create or replace view vista_navegadores as
select coalesce(navegador,'Desconocido') as navegador, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by navegador
order by visitas desc;

create or replace view vista_sistemas_operativos as
select coalesce(so,'Desconocido') as so, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by so
order by visitas desc;

create or replace view vista_idiomas as
select coalesce(idioma,'Desconocido') as idioma, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by idioma
order by visitas desc;

create or replace view vista_origenes_trafico as
select
  case
    when utm_source is not null then utm_source
    when referrer_dominio is null or referrer_dominio = '' then 'Directo'
    else referrer_dominio
  end as origen,
  count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and creado_en > now() - interval '30 days'
group by origen
order by visitas desc
limit 15;

create or replace view vista_utm_campanas as
select utm_source, utm_medium, utm_campaign, count(*) as visitas
from analytics_eventos
where tipo = 'pageview' and utm_source is not null and creado_en > now() - interval '30 days'
group by utm_source, utm_medium, utm_campaign
order by visitas desc;

create or replace view vista_terminos_busqueda as
select metadata->>'termino' as termino, count(*) as veces
from analytics_eventos
where tipo = 'busqueda' and metadata->>'termino' is not null and creado_en > now() - interval '30 days'
group by termino
order by veces desc
limit 20;

create or replace view vista_filtros_usados as
select metadata->>'filtro' as filtro, metadata->>'valor' as valor, count(*) as veces
from analytics_eventos
where tipo = 'filtro' and creado_en > now() - interval '30 days'
group by filtro, valor
order by veces desc
limit 20;

create or replace view vista_clics_cta as
select metadata->>'elemento' as elemento, count(*) as clics
from analytics_eventos
where tipo = 'click' and creado_en > now() - interval '30 days'
group by elemento
order by clics desc;

create or replace view vista_productos_mas_vistos as
select
  split_part(split_part(pagina, 'slug=', 2), '&', 1) as slug,
  count(*) as vistas
from analytics_eventos
where tipo = 'pageview' and pagina like '%producto.html%slug=%' and creado_en > now() - interval '30 days'
group by slug
order by vistas desc
limit 15;

create or replace view vista_tiempo_por_pagina as
select
  pagina,
  round(avg((metadata->>'tiempo_en_pagina')::numeric)) as segundos_promedio,
  round(avg((metadata->>'profundidad_scroll')::numeric)) as scroll_promedio_pct,
  count(*) as sesiones
from analytics_eventos
where tipo = 'engagement' and creado_en > now() - interval '30 days'
group by pagina
order by sesiones desc
limit 15;

-- Tasa de rebote: % de sesiones que solo vieron 1 página
create or replace view vista_tasa_rebote as
with por_sesion as (
  select session_id, count(*) as paginas_vistas
  from analytics_eventos
  where tipo = 'pageview' and creado_en > now() - interval '30 days'
  group by session_id
)
select
  count(*) filter (where paginas_vistas = 1) as sesiones_rebote,
  count(*) as sesiones_totales,
  round(100.0 * count(*) filter (where paginas_vistas = 1) / nullif(count(*),0), 1) as tasa_rebote_pct
from por_sesion;

grant select on
  vista_paises, vista_ciudades, vista_navegadores, vista_sistemas_operativos,
  vista_idiomas, vista_origenes_trafico, vista_utm_campanas, vista_terminos_busqueda,
  vista_filtros_usados, vista_clics_cta, vista_productos_mas_vistos,
  vista_tiempo_por_pagina, vista_tasa_rebote
to authenticated;
