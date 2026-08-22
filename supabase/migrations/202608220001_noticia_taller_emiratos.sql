alter table public.noticias add column if not exists slug text;
alter table public.noticias add column if not exists subtitulo text;
alter table public.noticias add column if not exists hora text;
alter table public.noticias add column if not exists lugar text;
alter table public.noticias add column if not exists direccion text;
alter table public.noticias add column if not exists organizacion text;
alter table public.noticias add column if not exists temario jsonb not null default '[]'::jsonb;

create unique index if not exists noticias_slug_unique
  on public.noticias (slug)
  where slug is not null;

update public.noticias set
  slug = 'loja-hacia-emiratos-arabes-unidos-2026',
  subtitulo = 'Oportunidades, negocios y estrategias para ingresar al mercado emiratí',
  hora = '10:00 a. m.',
  lugar = 'Salón de la Provincia, Prefectura de Loja',
  direccion = 'Bernardo Valdivieso y José Antonio Eguiguren, Loja',
  organizacion = 'Capacitación presencial organizada por la Prefectura de Loja, a través de la Cámara de Comercio de Emiratos Árabes Unidos.',
  temario = '[{"titulo":"Conozca el mercado","detalle":"¿Por qué Emiratos Árabes Unidos?"},{"titulo":"Identifique la oportunidad","detalle":"¿Qué productos ecuatorianos tienen potencial?"},{"titulo":"Aprenda a negociar","detalle":"¿Cómo hacer negocios en Emiratos?"},{"titulo":"Conozca los números","detalle":"Comercio Ecuador–Emiratos y oportunidades."},{"titulo":"Encuentre al comprador","detalle":"¿Quién puede comprar su producto?"},{"titulo":"Prepare su producto","detalle":"¿Está su producto listo para Emiratos?"},{"titulo":"Póngalo en práctica","detalle":"Caso práctico: de Ecuador al mercado emiratí."},{"titulo":"Convierta la oportunidad en negocio","detalle":"¿Cómo puede CCEATI acompañar a su empresa?"}]'::jsonb,
  imagen_url = 'assets/noticias/taller-loja-emiratos-2026.webp'
where lower(titulo) = lower('Loja hacia Emiratos Árabes Unidos')
  and fecha_evento = '2026-09-04'
  and slug is null;

insert into public.noticias
  (titulo, slug, subtitulo, resumen, contenido, imagen_url, tipo, fecha_evento, hora, lugar, direccion, organizacion, temario, activo)
select
  'Loja hacia Emiratos Árabes Unidos',
  'loja-hacia-emiratos-arabes-unidos-2026',
  'Oportunidades, negocios y estrategias para ingresar al mercado emiratí',
  'Taller presencial para conocer el mercado emiratí, identificar oportunidades y preparar productos lojanos para nuevos compradores.',
  'Durante el taller conoceremos el mercado emiratí, los productos ecuatorianos con potencial, las claves de negociación, la búsqueda de compradores y la preparación del producto para ingresar a este mercado.',
  'assets/noticias/taller-loja-emiratos-2026.webp',
  'capacitacion',
  '2026-09-04',
  '10:00 a. m.',
  'Salón de la Provincia, Prefectura de Loja',
  'Bernardo Valdivieso y José Antonio Eguiguren, Loja',
  'Capacitación presencial organizada por la Prefectura de Loja, a través de la Cámara de Comercio de Emiratos Árabes Unidos.',
  '[{"titulo":"Conozca el mercado","detalle":"¿Por qué Emiratos Árabes Unidos?"},{"titulo":"Identifique la oportunidad","detalle":"¿Qué productos ecuatorianos tienen potencial?"},{"titulo":"Aprenda a negociar","detalle":"¿Cómo hacer negocios en Emiratos?"},{"titulo":"Conozca los números","detalle":"Comercio Ecuador–Emiratos y oportunidades."},{"titulo":"Encuentre al comprador","detalle":"¿Quién puede comprar su producto?"},{"titulo":"Prepare su producto","detalle":"¿Está su producto listo para Emiratos?"},{"titulo":"Póngalo en práctica","detalle":"Caso práctico: de Ecuador al mercado emiratí."},{"titulo":"Convierta la oportunidad en negocio","detalle":"¿Cómo puede CCEATI acompañar a su empresa?"}]'::jsonb,
  true
where not exists (
  select 1 from public.noticias
  where slug = 'loja-hacia-emiratos-arabes-unidos-2026'
     or (lower(titulo) = lower('Loja hacia Emiratos Árabes Unidos') and fecha_evento = '2026-09-04')
);
