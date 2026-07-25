-- =========================================================
-- LOJANOVA — Campos en inglés (para exportación real)
-- Ejecutar en Supabase Dashboard > SQL Editor > New query
-- =========================================================

alter table productos add column if not exists nombre_en text;
alter table productos add column if not exists descripcion_corta_en text;
alter table productos add column if not exists descripcion_larga_en text;

alter table categorias add column if not exists nombre_en text;

-- Traducciones rápidas de las 12 categorías precargadas (edítalas si quieres)
update categorias set nombre_en = 'Coffee' where slug = 'cafe';
update categorias set nombre_en = 'Cacao' where slug = 'cacao';
update categorias set nombre_en = 'Honey' where slug = 'miel';
update categorias set nombre_en = 'Dairy' where slug = 'lacteos';
update categorias set nombre_en = 'Fruits' where slug = 'frutas';
update categorias set nombre_en = 'Handicrafts' where slug = 'artesanias';
update categorias set nombre_en = 'Textiles' where slug = 'textiles';
update categorias set nombre_en = 'Natural Cosmetics' where slug = 'cosmetica-natural';
update categorias set nombre_en = 'Processed Foods' where slug = 'alimentos-procesados';
update categorias set nombre_en = 'Beverages' where slug = 'bebidas';
update categorias set nombre_en = 'Ceramics' where slug = 'ceramica';
update categorias set nombre_en = 'Other' where slug = 'otros';
