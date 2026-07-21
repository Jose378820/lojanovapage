# Lojanova

Vitrina digital oficial de la **Prefectura de Loja** para dar visibilidad a los productos y emprendedores de la provincia. Sitio 100% HTML/CSS/JS estático, con contenido dinámico servido desde **Supabase** (base de datos + autenticación + almacenamiento de imágenes).

No es un e-commerce: no hay carrito ni pagos. Cada producto muestra información completa y los datos de contacto del emprendedor.

## Estructura del proyecto

```
lojanova/
├── index.html              → Landing page pública
├── producto.html            → Ficha de producto individual (?slug=...)
├── registro.html            → Registro de productores
├── login.html               → Login de productores
├── mi-panel.html            → Panel privado del productor
├── css/style.css            → Sistema de diseño del sitio público
├── js/
│   ├── config.js             → Credenciales de Supabase (URL + anon key)
│   ├── supabase-client.js    → Inicialización del cliente
│   ├── main.js                → Lógica de la landing (carga de datos, filtros)
│   ├── producto.js            → Lógica de la ficha de producto
│   ├── productor-auth.js      → Registro/login de productores
│   └── mi-panel.js            → CRUD privado del productor
├── admin/
│   ├── index.html            → Login del panel (Supabase Auth)
│   ├── dashboard.html         → Panel de administración (CRUD)
│   ├── css/admin.css
│   └── js/admin.js
├── supabase/schema.sql      → Esquema completo de base de datos + RLS
├── supabase/schema_productores.sql → Migración: cuentas de productor
└── .devcontainer/            → Configuración para GitHub Codespaces
```

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo (elige una región cercana, ej. `us-east-1`).
2. En **SQL Editor**, pega y ejecuta el contenido completo de `supabase/schema.sql`. Esto crea las tablas, los datos iniciales de cantones y categorías, las políticas de seguridad (RLS) y el bucket de almacenamiento para imágenes.
3. Luego ejecuta también `supabase/schema_productores.sql` (ver sección 4) para habilitar el registro de productores.
4. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public key` (o `Publishable key` en proyectos nuevos)

## 2. Conectar el sitio con tu proyecto de Supabase

Edita `js/config.js`:

```js
const SUPABASE_URL = "https://tu-proyecto.supabase.co";
const SUPABASE_ANON_KEY = "tu-anon-key-publica";
```

> La `anon key` es pública por diseño: la protección real la dan las políticas RLS definidas en `schema.sql` (lectura pública, administración global solo para admins y escritura limitada para cada productor).

## 3. Crear tu primer usuario administrador

1. En Supabase, ve a **Authentication → Users → Add user** y crea un usuario con correo y contraseña.
2. Copia el UUID de ese usuario.
3. En **SQL Editor**, ejecuta:

```sql
insert into admins (id, nombre) values ('PEGA-AQUI-EL-UUID', 'Nombre del administrador');
```

4. Ya puedes iniciar sesión en `admin/index.html` con ese correo y contraseña.

## 4. Registro y panel de productores

Los productores no usan el login administrador. Cada productor debe crear su propia cuenta en `registro.html` con nombre, emprendimiento, correo y contraseña.

Al registrarse:

1. Supabase Auth crea el usuario.
2. El trigger `crear_emprendedor_auth_trigger` (definido en `supabase/schema_productores.sql`) crea automáticamente el registro correspondiente en `emprendedores`.
3. La columna `emprendedores.auth_user_id` queda vinculada con `auth.users.id`.

Luego el productor ingresa por `login.html` y se redirige a `mi-panel.html`, donde solo puede editar su perfil y los productos asociados a su propio `emprendedor_id`.

El administrador sigue entrando por `admin/index.html`; ese login solo acepta usuarios registrados en la tabla `admins`.

**Importante:** si no ejecutas `schema_productores.sql`, el registro creará el usuario en Supabase Auth pero **no existirá fila en `emprendedores`**, por lo que el login fallará con "No existe un perfil de productor asociado a esta cuenta", y cualquier redirección a `mi-panel.html` fallará con un error 404 si además ese archivo no está presente en el repositorio.

## 5. Ejecutar el proyecto en GitHub Codespaces

1. Sube este proyecto a un repositorio de GitHub.
2. Haz clic en **Code → Codespaces → Create codespace on main**.
3. El `devcontainer` instala automáticamente `live-server`. Cuando el Codespace termine de construirse, ejecuta en la terminal:

```bash
live-server --port=8080
```

4. Codespaces abrirá una vista previa del sitio en el puerto 8080. Para ver el panel de administración, entra a `/admin/index.html` en esa misma vista previa. Para el portal de productores, entra a `/login.html`.

Alternativas si `live-server` no está disponible:

```bash
python3 -m http.server 8080
# o
node dev-server.js
```

## 6. Publicar el sitio (producción)

Al ser un proyecto 100% estático, puedes desplegarlo gratis en:

- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / `root`.
- **Vercel** o **Netlify**: conecta el repositorio, sin build command (es HTML plano) y con `/` como directorio de salida.

Recuerda que `js/config.js` debe apuntar siempre a tu proyecto real de Supabase antes de publicar, y que **todos los archivos** (`index.html`, `login.html`, `registro.html`, `mi-panel.html`, `admin/`, `js/`, `css/`) deben estar realmente subidos (commit + push) al repositorio, o el sitio publicado dará error 404 al intentar acceder a ellos.

## 7. Cargar contenido

Todo el contenido (categorías, cantones, emprendedores, productos, noticias) se administra desde `admin/dashboard.html`, sin tocar código:

1. Crea las **categorías** que vayas a usar (ya vienen 12 precargadas).
2. Registra a los **emprendedores** (o deja que se registren ellos mismos desde `registro.html`).
3. Publica **productos**, asociándolos a una categoría, un cantón y un emprendedor.
4. Publica **noticias** para ferias, capacitaciones y convocatorias.

Los cambios se reflejan de inmediato en el sitio público — no hace falta build ni redeploy.

## Notas técnicas

- Las imágenes pueden cargarse pegando una URL directa (ej. subida previamente a Supabase Storage, Cloudinary, etc.). Si prefieres subirlas desde el propio panel, puedes ampliar `admin/js/admin.js` usando `db.storage.from('lojanova-imagenes').upload(...)` — el bucket y las políticas ya están creados en `schema.sql`.
- El buscador del catálogo, los filtros por categoría/cantón/tipo y las estadísticas de la sección "Sobre el proyecto" son 100% dinámicos.
- El diseño sigue la paleta verde bosque + tierra + dorado, tipografía Playfair Display + Inter, e íconos [Lucide](https://lucide.dev).
