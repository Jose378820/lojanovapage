-- Diagnóstico de visibilidad pública de emprendedores y productos.
-- Es de solo lectura: no modifica ningún dato.

select
  count(*) as emprendedores_totales,
  count(*) filter (where estado = 'aprobado' and activo is true) as emprendedores_publicos,
  count(*) filter (where estado = 'pendiente') as emprendedores_pendientes,
  count(*) filter (where estado = 'rechazado') as emprendedores_rechazados,
  count(*) filter (where activo is not true) as emprendedores_inactivos
from public.emprendedores;

select
  count(*) as productos_totales,
  count(*) filter (
    where p.activo is true
      and e.estado = 'aprobado'
      and e.activo is true
  ) as productos_publicos,
  count(*) filter (where p.activo is not true) as productos_en_borrador,
  count(*) filter (
    where p.activo is true
      and (e.estado <> 'aprobado' or e.activo is not true)
  ) as productos_ocultos_por_estado_del_emprendedor
from public.productos p
left join public.emprendedores e on e.id = p.emprendedor_id;

select
  e.emprendimiento,
  e.nombre as emprendedor,
  e.estado,
  e.activo as emprendedor_activo,
  p.nombre as producto,
  p.activo as producto_activo,
  case
    when e.id is null then 'Producto sin emprendedor asociado'
    when p.activo is not true then 'Producto marcado como borrador'
    when e.estado <> 'aprobado' then 'Emprendedor no aprobado'
    when e.activo is not true then 'Emprendedor inactivo'
    else 'Visible públicamente'
  end as diagnostico
from public.productos p
left join public.emprendedores e on e.id = p.emprendedor_id
order by e.emprendimiento nulls last, p.nombre;
