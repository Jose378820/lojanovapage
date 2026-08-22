alter table public.noticias add column if not exists inscripcion_url text;

update public.noticias
set inscripcion_url = 'https://docs.google.com/forms/d/e/1FAIpQLScs0-jxauSPpBxFOszFK_l-cK4yXTSqL0FfeGmSsnDICZ8x2w/viewform'
where slug = 'loja-hacia-emiratos-arabes-unidos-2026';
