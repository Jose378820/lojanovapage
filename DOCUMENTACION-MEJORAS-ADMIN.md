# Mejoras institucionales del panel Lojanova

## Principio aplicado
Este paquete agrega mejoras al panel de administración existente sin reemplazar el sistema actual y sin tocar las tablas ni las métricas recolectadas.

## Funciones preservadas
- Login y logout de administradores.
- Gestión de productos.
- Gestión de emprendedores.
- Gestión de categorías.
- Gestión de cantones.
- Gestión de noticias.
- Solicitudes de productores.
- Aprobación, rechazo y eliminación mediante Edge Functions existentes.
- Analíticas históricas basadas en analytics_eventos y vistas vista_*.
- Gráficos actuales con Chart.js.
- Tablas actuales de países, ciudades, búsquedas, clics, páginas y productos vistos.

## Mejoras agregadas
- Barra superior institucional.
- Búsqueda global con Ctrl/Cmd + K.
- Centro de notificaciones visual.
- Modo oscuro persistente.
- Resumen ejecutivo adicional con datos reales.
- Contactos comerciales desde vista_clics_cta.
- Sección de contenido institucional informativa.
- Usuarios y permisos usando la tabla admins cuando esté disponible.
- Auditoría preparada sin datos simulados; consulta audit_logs si existe.
- Salud del sistema con revisión de Supabase, auth, analíticas y storage.
- Copias de seguridad como panel documental seguro.
- Reportes CSV desde datos reales existentes.
- Corrección visual de números KPI.

## Métricas
No se elimina ni modifica la lógica histórica de analíticas. Las consultas a analytics_eventos y vista_* se conservan en admin/js/admin.js.

## Rollback
Si necesitas volver atrás:
1. Copia los archivos dentro de BACKUP-ORIGINALES/admin/ sobre admin/.
2. Borra admin/css/admin-enhancements.css y admin/js/admin-enhancements.js.
3. Haz commit y push.
