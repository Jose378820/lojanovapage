// =========================================================
// LOJANOVA ADMIN — admin.js
// Auth guard + CRUD de productos, emprendedores, categorías y noticias
// =========================================================

let CATEGORIAS = [], CANTONES = [], EMPRENDEDORES = [];

/* ---------- Guard de sesión ---------- */
(async function guard(){
  const { data: { session } } = await db.auth.getSession();
  if (!session){ location.href = "index.html"; return; }
  const { data: perfil } = await db.from("admins").select("id").eq("id", session.user.id).maybeSingle();
  if (!perfil){
    await db.auth.signOut();
    location.href = "index.html";
    return;
  }
  iniciarDashboard();
})();

document.getElementById("btnLogout").addEventListener("click", async () => {
  await db.auth.signOut();
  location.href = "index.html";
});

/* ---------- Navegación entre vistas ---------- */
document.querySelectorAll(".sidebar nav button[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
    document.getElementById("view-" + btn.dataset.view).style.display = "block";
    document.getElementById("sidebar").classList.remove("open");
  });
});
document.getElementById("mobileToggle")?.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

/* ---------- Utilidades ---------- */
function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function slugify(str){
  return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function abrirModal(id){ document.getElementById(id).classList.add("open"); }
function cerrarModal(id){ document.getElementById(id).classList.remove("open"); }
document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => btn.closest(".modal-overlay").classList.remove("open"));
});
document.querySelectorAll(".modal-overlay").forEach(ov => {
  ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); });
});

/* ---------- Init general ---------- */
async function iniciarDashboard(){
  lucide.createIcons();
  await cargarListasBase();
  await Promise.all([cargarKPIs(), cargarProductos(), cargarEmprendedores(), cargarCategorias(), cargarNoticias(), cargarCantones()]);
}

async function cargarListasBase(){
  const [{ data: cats }, { data: cants }, { data: emps }] = await Promise.all([
    db.from("categorias").select("*").order("orden"),
    db.from("cantones").select("*").order("orden"),
    db.from("emprendedores").select("id, nombre, emprendimiento").order("nombre"),
  ]);
  CATEGORIAS = cats || []; CANTONES = cants || []; EMPRENDEDORES = emps || [];

  const optsCat = `<option value="">Selecciona…</option>` + CATEGORIAS.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
  const optsCant = `<option value="">Selecciona…</option>` + CANTONES.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
  const optsEmp = `<option value="">Selecciona…</option>` + EMPRENDEDORES.map(e => `<option value="${e.id}">${escapeHtml(e.nombre)} — ${escapeHtml(e.emprendimiento)}</option>`).join("");

  document.getElementById("p_categoria").innerHTML = optsCat;
  document.getElementById("p_canton").innerHTML = optsCant;
  document.getElementById("p_emprendedor").innerHTML = optsEmp;
  document.getElementById("e_canton").innerHTML = optsCant;
}

async function cargarKPIs(){
  const [p, e, c, n] = await Promise.all([
    db.from("productos").select("id", { count: "exact", head: true }).eq("activo", true),
    db.from("emprendedores").select("id", { count: "exact", head: true }).eq("activo", true),
    db.from("categorias").select("id", { count: "exact", head: true }),
    db.from("noticias").select("id", { count: "exact", head: true }).eq("activo", true),
  ]);
  document.getElementById("kpiProductos").textContent = p.count ?? 0;
  document.getElementById("kpiEmprendedores").textContent = e.count ?? 0;
  document.getElementById("kpiCategorias").textContent = c.count ?? 0;
  document.getElementById("kpiNoticias").textContent = n.count ?? 0;
}

/* =========================================================
   PRODUCTOS
   ========================================================= */
async function cargarProductos(){
  const { data, error } = await db.from("productos").select("*, categorias(nombre), cantones(nombre)").order("created_at", { ascending:false });
  const tbody = document.getElementById("tablaProductos");
  if (error || !data || data.length === 0){ tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Aún no hay productos. Crea el primero.</td></tr>`; return; }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td><img class="thumb-sm" src="${p.imagen_principal_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20'}" alt=""></td>
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(p.categorias?.nombre || '—')}</td>
      <td>${escapeHtml(p.cantones?.nombre || '—')}</td>
      <td><span class="status-pill ${p.activo ? 'on':'off'}">${p.activo ? 'Publicado':'Oculto'}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editarProducto('${p.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.id}','${escapeHtml(p.nombre)}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
  window.__productosCache = data;
}

document.getElementById("btnNuevoProducto").addEventListener("click", () => {
  document.getElementById("formProducto").reset();
  document.getElementById("p_id").value = "";
  document.getElementById("tituloModalProducto").textContent = "Nuevo producto";
  abrirModal("modalProducto");
});

window.editarProducto = function(id){
  const p = window.__productosCache.find(x => x.id === id);
  if (!p) return;
  document.getElementById("tituloModalProducto").textContent = "Editar producto";
  document.getElementById("p_id").value = p.id;
  document.getElementById("p_nombre").value = p.nombre || "";
  document.getElementById("p_categoria").value = p.categoria_id || "";
  document.getElementById("p_canton").value = p.canton_id || "";
  document.getElementById("p_emprendedor").value = p.emprendedor_id || "";
  document.getElementById("p_desc_corta").value = p.descripcion_corta || "";
  document.getElementById("p_desc_larga").value = p.descripcion_larga || "";
  document.getElementById("p_historia").value = p.historia || "";
  document.getElementById("p_proceso").value = p.proceso_elaboracion || "";
  document.getElementById("p_ingredientes").value = p.ingredientes || "";
  document.getElementById("p_certificaciones").value = p.certificaciones || "";
  document.getElementById("p_capacidad").value = p.capacidad_produccion || "";
  document.getElementById("p_presentacion").value = p.presentacion || "";
  document.getElementById("p_peso").value = p.peso || "";
  document.getElementById("p_disponibilidad").value = p.disponibilidad || "";
  document.getElementById("p_mercados").value = p.mercados || "";
  document.getElementById("p_tipo").value = p.tipo_emprendimiento || "";
  document.getElementById("p_etiquetas").value = (p.etiquetas || []).join(", ");
  document.getElementById("p_imagen").value = p.imagen_principal_url || "";
  document.getElementById("p_exportacion").checked = !!p.es_exportacion;
  document.getElementById("p_artesanal").checked = !!p.es_artesanal;
  document.getElementById("p_activo").checked = !!p.activo;
  abrirModal("modalProducto");
};

window.eliminarProducto = async function(id, nombre){
  if (!confirm(`¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from("productos").delete().eq("id", id);
  if (error){ alert("No se pudo eliminar: " + error.message); return; }
  cargarProductos(); cargarKPIs();
};

document.getElementById("formProducto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("p_id").value;
  const nombre = document.getElementById("p_nombre").value.trim();
  const payload = {
    nombre,
    slug: slugify(nombre) + (id ? "" : "-" + Date.now().toString(36)),
    categoria_id: document.getElementById("p_categoria").value || null,
    canton_id: document.getElementById("p_canton").value || null,
    emprendedor_id: document.getElementById("p_emprendedor").value || null,
    descripcion_corta: document.getElementById("p_desc_corta").value.trim(),
    descripcion_larga: document.getElementById("p_desc_larga").value.trim(),
    historia: document.getElementById("p_historia").value.trim(),
    proceso_elaboracion: document.getElementById("p_proceso").value.trim(),
    ingredientes: document.getElementById("p_ingredientes").value.trim(),
    certificaciones: document.getElementById("p_certificaciones").value.trim(),
    capacidad_produccion: document.getElementById("p_capacidad").value.trim(),
    presentacion: document.getElementById("p_presentacion").value.trim(),
    peso: document.getElementById("p_peso").value.trim(),
    disponibilidad: document.getElementById("p_disponibilidad").value.trim(),
    mercados: document.getElementById("p_mercados").value.trim(),
    tipo_emprendimiento: document.getElementById("p_tipo").value.trim(),
    etiquetas: document.getElementById("p_etiquetas").value.split(",").map(s => s.trim()).filter(Boolean),
    imagen_principal_url: document.getElementById("p_imagen").value.trim(),
    es_exportacion: document.getElementById("p_exportacion").checked,
    es_artesanal: document.getElementById("p_artesanal").checked,
    activo: document.getElementById("p_activo").checked,
  };

  // Si se edita, no se debe pisar el slug original
  if (id) delete payload.slug;

  const query = id ? db.from("productos").update(payload).eq("id", id) : db.from("productos").insert(payload);
  const { error } = await query;
  if (error){ alert("No se pudo guardar: " + error.message); return; }
  cerrarModal("modalProducto");
  cargarProductos(); cargarKPIs();
});

/* =========================================================
   EMPRENDEDORES
   ========================================================= */
async function cargarEmprendedores(){
  const { data, error } = await db.from("emprendedores").select("*, cantones(nombre)").order("created_at", { ascending:false });
  const tbody = document.getElementById("tablaEmprendedores");
  if (error || !data || data.length === 0){ tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Aún no hay emprendedores. Registra el primero.</td></tr>`; return; }
  tbody.innerHTML = data.map(e => `
    <tr>
      <td><img class="thumb-sm" src="${e.foto_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20'}" alt=""></td>
      <td>${escapeHtml(e.nombre)}</td>
      <td>${escapeHtml(e.emprendimiento)}</td>
      <td>${escapeHtml(e.cantones?.nombre || '—')}</td>
      <td><span class="status-pill ${e.activo ? 'on':'off'}">${e.activo ? 'Publicado':'Oculto'}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editarEmprendedor('${e.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarEmprendedor('${e.id}','${escapeHtml(e.nombre)}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
  window.__empCache = data;
}

document.getElementById("btnNuevoEmprendedor").addEventListener("click", () => {
  document.getElementById("formEmprendedor").reset();
  document.getElementById("e_id").value = "";
  document.getElementById("tituloModalEmprendedor").textContent = "Nuevo emprendedor";
  abrirModal("modalEmprendedor");
});

window.editarEmprendedor = function(id){
  const e = window.__empCache.find(x => x.id === id);
  if (!e) return;
  document.getElementById("tituloModalEmprendedor").textContent = "Editar emprendedor";
  document.getElementById("e_id").value = e.id;
  document.getElementById("e_nombre").value = e.nombre || "";
  document.getElementById("e_emprendimiento").value = e.emprendimiento || "";
  document.getElementById("e_canton").value = e.canton_id || "";
  document.getElementById("e_anios").value = e.anios_experiencia || "";
  document.getElementById("e_historia").value = e.historia || "";
  document.getElementById("e_telefono").value = e.telefono || "";
  document.getElementById("e_whatsapp").value = e.whatsapp || "";
  document.getElementById("e_correo").value = e.correo || "";
  document.getElementById("e_ubicacion").value = e.ubicacion || "";
  document.getElementById("e_facebook").value = e.facebook || "";
  document.getElementById("e_instagram").value = e.instagram || "";
  document.getElementById("e_foto").value = e.foto_url || "";
  document.getElementById("e_activo").checked = !!e.activo;
  abrirModal("modalEmprendedor");
};

window.eliminarEmprendedor = async function(id, nombre){
  if (!confirm(`¿Eliminar a "${nombre}"? Esto también puede afectar productos asociados.`)) return;
  const { error } = await db.from("emprendedores").delete().eq("id", id);
  if (error){ alert("No se pudo eliminar: " + error.message); return; }
  cargarEmprendedores(); cargarKPIs(); cargarListasBase();
};

document.getElementById("formEmprendedor").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("e_id").value;
  const payload = {
    nombre: document.getElementById("e_nombre").value.trim(),
    emprendimiento: document.getElementById("e_emprendimiento").value.trim(),
    canton_id: document.getElementById("e_canton").value || null,
    anios_experiencia: document.getElementById("e_anios").value ? Number(document.getElementById("e_anios").value) : null,
    historia: document.getElementById("e_historia").value.trim(),
    telefono: document.getElementById("e_telefono").value.trim(),
    whatsapp: document.getElementById("e_whatsapp").value.trim(),
    correo: document.getElementById("e_correo").value.trim(),
    ubicacion: document.getElementById("e_ubicacion").value.trim(),
    facebook: document.getElementById("e_facebook").value.trim(),
    instagram: document.getElementById("e_instagram").value.trim(),
    foto_url: document.getElementById("e_foto").value.trim(),
    activo: document.getElementById("e_activo").checked,
  };
  const query = id ? db.from("emprendedores").update(payload).eq("id", id) : db.from("emprendedores").insert(payload);
  const { error } = await query;
  if (error){ alert("No se pudo guardar: " + error.message); return; }
  cerrarModal("modalEmprendedor");
  cargarEmprendedores(); cargarKPIs(); cargarListasBase();
});

/* =========================================================
   CATEGORÍAS
   ========================================================= */
async function cargarCategorias(){
  const { data, error } = await db.from("categorias").select("*").order("orden");
  const tbody = document.getElementById("tablaCategorias");
  if (error || !data || data.length === 0){ tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Aún no hay categorías.</td></tr>`; return; }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><img class="thumb-sm" src="${c.imagen_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20'}" alt=""></td>
      <td>${escapeHtml(c.nombre)}</td>
      <td>${escapeHtml(c.slug)}</td>
      <td>${c.orden ?? 0}</td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editarCategoria('${c.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarCategoria('${c.id}','${escapeHtml(c.nombre)}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
  window.__catCache = data;
}

document.getElementById("btnNuevaCategoria").addEventListener("click", () => {
  document.getElementById("formCategoria").reset();
  document.getElementById("c_id").value = "";
  document.getElementById("tituloModalCategoria").textContent = "Nueva categoría";
  abrirModal("modalCategoria");
});

window.editarCategoria = function(id){
  const c = window.__catCache.find(x => x.id === id);
  if (!c) return;
  document.getElementById("tituloModalCategoria").textContent = "Editar categoría";
  document.getElementById("c_id").value = c.id;
  document.getElementById("c_nombre").value = c.nombre || "";
  document.getElementById("c_orden").value = c.orden ?? 0;
  document.getElementById("c_descripcion").value = c.descripcion || "";
  document.getElementById("c_imagen").value = c.imagen_url || "";
  abrirModal("modalCategoria");
};

window.eliminarCategoria = async function(id, nombre){
  if (!confirm(`¿Eliminar la categoría "${nombre}"? Los productos asociados quedarán sin categoría.`)) return;
  const { error } = await db.from("categorias").delete().eq("id", id);
  if (error){ alert("No se pudo eliminar: " + error.message); return; }
  cargarCategorias(); cargarKPIs(); cargarListasBase();
};

document.getElementById("formCategoria").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("c_id").value;
  const nombre = document.getElementById("c_nombre").value.trim();
  const payload = {
    nombre,
    slug: slugify(nombre),
    orden: Number(document.getElementById("c_orden").value) || 0,
    descripcion: document.getElementById("c_descripcion").value.trim(),
    imagen_url: document.getElementById("c_imagen").value.trim(),
  };
  const query = id ? db.from("categorias").update(payload).eq("id", id) : db.from("categorias").insert(payload);
  const { error } = await query;
  if (error){ alert("No se pudo guardar: " + error.message); return; }
  cerrarModal("modalCategoria");
  cargarCategorias(); cargarKPIs(); cargarListasBase();
});

/* =========================================================
   NOTICIAS
   ========================================================= */
const TIPO_LABEL = { feria:"Feria", rueda_negocios:"Rueda de negocios", capacitacion:"Capacitación", convocatoria:"Convocatoria", evento:"Evento" };

async function cargarNoticias(){
  const { data, error } = await db.from("noticias").select("*").order("created_at", { ascending:false });
  const tbody = document.getElementById("tablaNoticias");
  if (error || !data || data.length === 0){ tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Aún no hay noticias.</td></tr>`; return; }
  tbody.innerHTML = data.map(n => `
    <tr>
      <td><img class="thumb-sm" src="${n.imagen_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20'}" alt=""></td>
      <td>${escapeHtml(n.titulo)}</td>
      <td>${TIPO_LABEL[n.tipo] || n.tipo || '—'}</td>
      <td>${n.fecha_evento || '—'}</td>
      <td><span class="status-pill ${n.activo ? 'on':'off'}">${n.activo ? 'Publicada':'Oculta'}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editarNoticia('${n.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarNoticia('${n.id}','${escapeHtml(n.titulo)}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
  window.__newsCache = data;
}

document.getElementById("btnNuevaNoticia").addEventListener("click", () => {
  document.getElementById("formNoticia").reset();
  document.getElementById("n_id").value = "";
  document.getElementById("tituloModalNoticia").textContent = "Nueva noticia";
  abrirModal("modalNoticia");
});

window.editarNoticia = function(id){
  const n = window.__newsCache.find(x => x.id === id);
  if (!n) return;
  document.getElementById("tituloModalNoticia").textContent = "Editar noticia";
  document.getElementById("n_id").value = n.id;
  document.getElementById("n_titulo").value = n.titulo || "";
  document.getElementById("n_tipo").value = n.tipo || "evento";
  document.getElementById("n_fecha").value = n.fecha_evento || "";
  document.getElementById("n_resumen").value = n.resumen || "";
  document.getElementById("n_contenido").value = n.contenido || "";
  document.getElementById("n_imagen").value = n.imagen_url || "";
  document.getElementById("n_activo").checked = !!n.activo;
  abrirModal("modalNoticia");
};

window.eliminarNoticia = async function(id, titulo){
  if (!confirm(`¿Eliminar la noticia "${titulo}"?`)) return;
  const { error } = await db.from("noticias").delete().eq("id", id);
  if (error){ alert("No se pudo eliminar: " + error.message); return; }
  cargarNoticias(); cargarKPIs();
};

document.getElementById("formNoticia").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("n_id").value;
  const payload = {
    titulo: document.getElementById("n_titulo").value.trim(),
    tipo: document.getElementById("n_tipo").value,
    fecha_evento: document.getElementById("n_fecha").value || null,
    resumen: document.getElementById("n_resumen").value.trim(),
    contenido: document.getElementById("n_contenido").value.trim(),
    imagen_url: document.getElementById("n_imagen").value.trim(),
    activo: document.getElementById("n_activo").checked,
  };
  const query = id ? db.from("noticias").update(payload).eq("id", id) : db.from("noticias").insert(payload);
  const { error } = await query;
  if (error){ alert("No se pudo guardar: " + error.message); return; }
  cerrarModal("modalNoticia");
  cargarNoticias(); cargarKPIs();
});

/* =========================================================
   CANTONES (solo lectura desde el panel — vienen precargados)
   ========================================================= */
async function cargarCantones(){
  const { data, error } = await db.from("cantones").select("*").order("orden");
  const tbody = document.getElementById("tablaCantones");
  if (error || !data || data.length === 0){ tbody.innerHTML = `<tr class="empty-row"><td colspan="2">Sin datos.</td></tr>`; return; }
  tbody.innerHTML = data.map(c => `<tr><td>${escapeHtml(c.nombre)}</td><td>${c.orden ?? 0}</td></tr>`).join("");
}
