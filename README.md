# Lojanova

Vitrina digital oficial de la **Prefectura de Loja** para dar visibilidad a los productos y emprendedores de la provincia. Sitio 100% HTML/CSS/JS estático, con contenido dinámico servido desde **Supabase** (base de datos + autenticación + almacenamiento de imágenes).

No es un e-commerce: no hay carrito ni pagos. Cada producto muestra información completa y los datos de contacto del emprendedor.

## Estructura del proyecto

```
lojanova/
├── index.html              → Landing page pública
├── producto.html            → Ficha de producto individual (?slug=...)
├── css/style.css            → Sistema de diseño del sitio público
├── js/
│   ├── config.js             → Credenciales de Supabase (URL + anon key)
│   ├── supabase-client.js    → Inicialización del cliente
│   ├── main.js                → Lógica de la landing (carga de datos, filtros)
│   └── producto.js            → Lógica de la ficha de producto
├── admin/
│   ├── index.html            → Login del panel (Supabase Auth)
│   ├── dashboard.html         → Panel de administración (CRUD)
│   ├── css/admin.css
│   └── js/admin.js
├── supabase/schema.sql      → Esquema completo de base de datos + RLS
└── .devcontainer/            → Configuración para GitHub Codespaces
```

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo (elige una región cercana, ej. `us-east-1`).
2. En **SQL Editor**, pega y ejecuta el contenido completo de `supabase/schema.sql`. Esto crea las tablas, los datos iniciales de cantones y categorías, las políticas de seguridad (RLS) y el bucket de almacenamiento para imágenes.
3. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public key`

## 2. Conectar el sitio con tu proyecto de Supabase

Edita `js/config.js`:

```js
const SUPABASE_URL = "https://tu-proyecto.supabase.co";
const SUPABASE_ANON_KEY = "tu-anon-key-publica";
```

> La `anon key` es pública por diseño: la protección real la dan las políticas RLS definidas en `schema.sql` (lectura pública, escritura solo para administradores).

## 3. Crear tu primer usuario administrador

1. En Supabase, ve a **Authentication → Users → Add user** y crea un usuario con correo y contraseña.
2. Copia el UUID de ese usuario.
3. En **SQL Editor**, ejecuta:

```sql
insert into admins (id, nombre) values ('PEGA-AQUI-EL-UUID', 'Nombre del administrador');
```

4. Ya puedes iniciar sesión en `admin/index.html` con ese correo y contraseña.

## 4. Ejecutar el proyecto en GitHub Codespaces

1. Sube este proyecto a un repositorio de GitHub.
2. Haz clic en **Code → Codespaces → Create codespace on main**.
3. El `devcontainer` instala automáticamente `live-server`. Cuando el Codespace termine de construirse, ejecuta en la terminal:

```bash
live-server --port=8080
```

4. Codespaces abrirá una vista previa del sitio en el puerto 8080. Para ver el panel de administración, entra a `/admin/index.html` en esa misma vista previa.

Alternativa sin `live-server`, con Python (ya viene instalado en la imagen base):

```bash
python3 -m http.server 8080
```

## 5. Publicar el sitio (producción)

Al ser un proyecto 100% estático, puedes desplegarlo gratis en:

- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / `root`.
- **Vercel** o **Netlify**: conecta el repositorio, sin build command (es HTML plano) y con `/` como directorio de salida.

Recuerda que `js/config.js` debe apuntar siempre a tu proyecto real de Supabase antes de publicar.

## 6. Cargar contenido

Todo el contenido (categorías, cantones, emprendedores, productos, noticias) se administra desde `admin/dashboard.html`, sin tocar código:

1. Crea las **categorías** que vayas a usar (ya vienen 12 precargadas).
2. Registra a los **emprendedores**.
3. Publica **productos**, asociándolos a una categoría, un cantón y un emprendedor.
4. Publica **noticias** para ferias, capacitaciones y convocatorias.

Los cambios se reflejan de inmediato en el sitio público — no hace falta build ni redeploy.

## Notas técnicas

- Las imágenes pueden cargarse pegando una URL directa (ej. subida previamente a Supabase Storage, Cloudinary, etc.). Si prefieres subirlas desde el propio panel, puedes ampliar `admin/js/admin.js` usando `db.storage.from('lojanova-imagenes').upload(...)` — el bucket y las políticas ya están creados en `schema.sql`.
- El buscador del catálogo, los filtros por categoría/cantón/tipo y las estadísticas de la sección "Sobre el proyecto" son 100% dinámicos.
- El diseño sigue la paleta verde bosque + tierra + dorado, tipografía Playfair Display + Inter, e íconos [Lucide](https://lucide.dev).
