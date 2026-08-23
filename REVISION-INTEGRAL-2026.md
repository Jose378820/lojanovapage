# Revisión integral de Lojanova — agosto de 2026

## Alcance

Se revisaron la página pública, catálogo y fichas, noticias, autenticación, panel del emprendedor, administración, analíticas, Supabase, Storage, PWA, SEO, despliegue y estructura general. No se eliminaron páginas, funciones, datos, migraciones ni respaldos históricos.

## Correcciones aplicadas

- Se corrigió la estructura del panel administrativo: ocho vistas estaban fuera del contenedor principal por un cierre anticipado de etiquetas HTML.
- Se repararon caracteres dañados en la pantalla de acceso administrativo.
- Se actualizó el dominio del sitemap a `prefecturalojanova.com` tanto en `robots.txt` como en la función que genera el sitemap.
- Se unificó el registro alternativo de productores con el flujo vigente. Ya no intenta crear un segundo perfil activo ni elude el proceso de aprobación.
- Se añadieron confirmación de contraseña y rutas absolutas seguras al registro del productor.
- Se añadieron metadatos dinámicos para que productos y noticias muestren título, resumen, imagen y enlace correctos al compartirse en buscadores, WhatsApp y redes sociales.
- Se evitó consultar imágenes con un producto inexistente y se añadió una defensa a una función histórica de emprendedores que podía ejecutarse sin su contenedor HTML.
- Se conserva la geolocalización de analíticas durante la sesión para no consultar un servicio externo en cada página, sin reducir los registros de visitas.

## Verificaciones realizadas

## Auditoría especializada de analíticas

- Los eventos históricos permanecen intactos: la migración no contiene borrados ni actualizaciones de filas.
- Las sesiones nuevas rotan después de 30 minutos de inactividad, evitando duraciones artificiales de varios días.
- Productos y noticias registran su identificador (`slug`) y las noticias ya participan en la medición.
- Los eventos nuevos incluyen dispositivo, navegador, sistema operativo, idioma, resolución, conexión, origen y campañas UTM.
- Se incorporan búsquedas, filtros, contactos, inscripción, compartir, instalación, tiempo activo y profundidad de scroll.
- Las recargas inmediatas de una misma página se deduplican durante 10 segundos.
- Los cortes diarios y horarios usan la zona `America/Guayaquil`.
- Visitantes únicos de 30 días usa sesiones distintas y no suma nuevamente a quienes regresan otro día.
- Tiempo y scroll se consolidan por sesión y página para no inflar la muestra.
- La tasa de rebote considera una sola página sin al menos 10 segundos de interacción ni 50 % de scroll.
- La inserción pública valida tamaño, tipo y longitud del evento, sin conceder lectura pública.

- Sintaxis de todos los archivos JavaScript activos.
- Referencias a archivos CSS, JavaScript, imágenes y páginas locales.
- IDs HTML duplicados.
- Búsqueda de credenciales privadas y claves de servicio expuestas.
- Coherencia de rutas, dominio público y archivos de despliegue.
- Revisión de políticas RLS, funciones, vistas analíticas y migraciones disponibles.
- Revisión de flujo público → producto/emprendedor → panel → Supabase.

## Observaciones que no se modificaron

1. **Imágenes antiguas en Storage.** Al reemplazar una imagen pueden quedar archivos sin uso. No se borraron porque el requisito es preservar todo y una limpieza debe realizarse únicamente después de generar un inventario y respaldo.
2. **Analíticas compatibles.** Una visita se registra en la tabla histórica y en la tabla nueva. Esto consume algo más de base de datos, pero se conserva para no alterar informes ni series existentes.
3. **Límite futuro del catálogo.** La portada carga el catálogo activo completo. Con el volumen actual es válido; si crece significativamente convendrá paginar desde Supabase.
4. **Servicio externo de geolocalización.** Continúa siendo opcional y tolerante a fallos. Ahora se consulta una sola vez por sesión.
5. **Archivos históricos y utilidades.** Se conservaron íntegros. Para desplegar deben considerarse activos únicamente los archivos enlazados por las páginas públicas, el panel y la configuración vigente.
6. **Seguridad de analíticas públicas.** Las inserciones anónimas son necesarias para medir tráfico, pero pueden recibir tráfico automatizado. Una protección adicional requeriría una función intermedia con límite de frecuencia; no se agregó para no interrumpir la medición actual.

## Recomendaciones operativas

- Probar primero en la vista previa de Cloudflare Pages y después publicar en producción.
- Mantener una copia de la base de datos y del bucket antes de cualquier limpieza de imágenes.
- Verificar mensualmente el uso de Database y Storage en Supabase.
- No colocar nunca la `service_role` en archivos públicos; el proyecto revisado usa solamente la clave publicable en el navegador.
