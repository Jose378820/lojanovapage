-- Actualiza únicamente las imágenes de la noticia del taller de Emiratos.
-- No modifica su contenido, fecha, estado ni enlace de inscripción.

update public.noticias
set
  imagen_url = 'assets/noticias/taller-emiratos-portada.webp',
  galeria = '[{"url":"assets/noticias/taller-emiratos-temario.webp","descripcion":"Temario oficial del taller Ecuador hacia Emiratos Árabes Unidos."}]'::jsonb
where slug = 'loja-hacia-emiratos-arabes-unidos-2026';
