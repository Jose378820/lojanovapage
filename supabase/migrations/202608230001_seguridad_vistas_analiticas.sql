-- Corrige las vistas de analíticas señaladas por Supabase Security Advisor.
-- SECURITY INVOKER obliga a respetar el RLS de public.analytics_eventos.

do $$
declare
  nombre_vista text;
  vistas text[] := array[
    'vista_visitas_diarias',
    'vista_paginas_top',
    'vista_horas_pico',
    'vista_dispositivos',
    'vista_duracion_sesiones',
    'vista_paises',
    'vista_ciudades',
    'vista_navegadores',
    'vista_sistemas_operativos',
    'vista_idiomas',
    'vista_origenes_trafico',
    'vista_utm_campanas',
    'vista_terminos_busqueda',
    'vista_filtros_usados',
    'vista_clics_cta',
    'vista_productos_mas_vistos',
    'vista_tiempo_por_pagina',
    'vista_tasa_rebote'
  ];
begin
  foreach nombre_vista in array vistas loop
    if to_regclass(format('public.%I', nombre_vista)) is not null then
      execute format('alter view public.%I set (security_invoker = true)', nombre_vista);
      execute format('revoke all privileges on public.%I from anon', nombre_vista);
      execute format('grant select on public.%I to authenticated', nombre_vista);
    end if;
  end loop;
end
$$;

-- El rol autenticado necesita permiso SQL sobre la tabla base; RLS decide qué filas ve.
grant select on public.analytics_eventos to authenticated;
revoke select on public.analytics_eventos from anon;

-- Conserva el registro público de visitas sin conceder lectura pública.
grant insert on public.analytics_eventos to anon, authenticated;
