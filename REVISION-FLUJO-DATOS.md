# Revisión del flujo de datos de emprendedores

## Flujo verificado

1. Supabase Auth identifica al productor por `auth_user_id`.
2. El panel consulta únicamente su fila en `emprendedores`.
3. El panel consulta y modifica productos asociados a su `emprendedor_id`.
4. Las políticas RLS restringen la escritura al propietario y la lectura pública a emprendedores aprobados/activos y productos activos.
5. La página principal consulta los productos públicos y los agrupa por marca.
6. `marca.html` muestra todos los productos públicos de la marca.
7. `producto.html` muestra la ficha técnica y la información pública del emprendedor.

## Problemas encontrados y corregidos

- El panel no permitía editar cinco campos que ya existen en Supabase y que la ficha pública sabe mostrar: historia del producto, certificaciones, capacidad de producción, peso y tipo de emprendimiento.
- Esos campos se incorporaron al formulario, a la carga de edición y al payload de guardado.
- La ubicación guardada en el perfil ahora también aparece en la página pública de la marca.
- Se corrigió una colisión global entre `main.js` y `pwa-install.js` que generaba un error JavaScript.
- Se actualizaron las versiones de los scripts y del caché PWA para evitar que Cloudflare o el navegador mantengan archivos anteriores.
- El KPI de emprendedores ahora cuenta únicamente marcas que tienen al menos un producto público y que, por tanto, aparecen realmente en el catálogo.

## Visibilidad esperada

Un producto aparece públicamente únicamente cuando:

- el producto tiene `activo = true`;
- su emprendedor tiene `activo = true`;
- el emprendedor tiene `estado = 'aprobado'`.

El archivo `supabase/verificar_visibilidad_publica.sql` permite identificar los registros que no cumplen estas condiciones. Es de solo lectura y no modifica datos.

## Pruebas

- Sintaxis JavaScript comprobada.
- Página principal cargada localmente contra la lectura pública real de Supabase: 29 marcas visibles y sin errores de consola.
- Marca con varios productos verificada: el contador y las tarjetas coincidieron.
- Ficha de producto verificada con datos técnicos y emprendedor asociado.
- Correspondencia entre campos del panel, columnas de Supabase y bloques de la ficha pública comprobada.

No se cambió el esquema de datos ni se ejecutaron escrituras sobre producción.
