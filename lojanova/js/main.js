// =========================================================
// LOJANOVA — main.js
// Interacciones de la landing + carga de datos desde Supabase
// =========================================================

/* ---------- Navbar ---------- */
const navbar = document.getElementById("navbar");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
});
navToggle?.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

/* ---------- Scroll reveal ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
function observeReveals(){ document.querySelectorAll(".reveal:not(.visible)").forEach(el => revealObserver.observe(el)); }
observeReveals();

/* ---------- Helpers ---------- */
function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function cortar(str, n){ if(!str) return ""; return str.length > n ? str.slice(0,n).trim() + "…" : str; }

/* ---------- Estado global de filtros ---------- */
let PRODUCTOS = [];
let CATEGORIAS = [];
let CANTONES = [];

/* ---------- Cargar categorías ---------- */
async function cargarCategorias(){
  const { data, error } = await db.from("categorias").select("*").order("orden");
  const grid = document.getElementById("catGrid");
  const selectCat = document.getElementById("fCategoria");
  if (error || !data || data.length === 0){
    grid.innerHTML = `<div class="empty-state">Aún no hay categorías cargadas. Ingresa al panel de administración para crear la primera.</div>`;
    return;
  }
  CATEGORIAS = data;
  grid.innerHTML = data.map(c => `
    <div class="cat-card reveal" data-cat="${c.id}">
      <img src="${urlImagen(c.imagen_url)}" alt="${escapeHtml(c.nombre)}" loading="lazy">
      <div class="cat-card-label">
        <h3>${escapeHtml(c.nombre)}</h3>
        <span>Ver productos</span>
      </div>
    </div>
  `).join("");
  selectCat.innerHTML = `<option value="">Categoría</option>` + data.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
  grid.querySelectorAll(".cat-card").forEach(card => {
    card.addEventListener("click", () => {
      selectCat.value = card.dataset.cat;
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
      renderProductos();
    });
  });
  observeReveals();
}

/* ---------- Cargar cantones ---------- */
async function cargarCantones(){
  const { data, error } = await db.from("cantones").select("*").order("orden");
  const selectCanton = document.getElementById("fCanton");
  const pillList = document.getElementById("cantonList");
  if (error || !data) return;
  CANTONES = data;
  selectCanton.innerHTML = `<option value="">Cantón</option>` + data.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
  pillList.innerHTML = data.map(c => `<span class="canton-pill">${escapeHtml(c.nombre)}</span>`).join("");
}

/* ---------- Cargar y renderizar productos ---------- */
async function cargarProductos(){
  const { data, error } = await db
    .from("productos")
    .select("*, categorias(nombre), cantones(nombre)")
    .eq("activo", true)
    .order("created_at", { ascending: false });
  if (error || !data){
    document.getElementById("productGrid").innerHTML = `<div class="empty-state">No se pudieron cargar los productos.</div>`;
    return;
  }
  PRODUCTOS = data;
  renderProductos();
}

function renderProductos(){
  const grid = document.getElementById("productGrid");
  const q = document.getElementById("fBuscar").value.trim().toLowerCase();
  const cat = document.getElementById("fCategoria").value;
  const canton = document.getElementById("fCanton").value;
  const tipo = document.getElementById("fTipo").value;

  let lista = PRODUCTOS.filter(p => {
    if (cat && p.categoria_id !== cat) return false;
    if (canton && p.canton_id !== canton) return false;
    if (tipo === "exportacion" && !p.es_exportacion) return false;
    if (tipo === "artesanal" && !p.es_artesanal) return false;
    if (q && !(`${p.nombre} ${p.descripcion_corta}`.toLowerCase().includes(q))) return false;
    return true;
  });

  if (PRODUCTOS.length === 0){
    grid.innerHTML = `<div class="empty-state">Todavía no hay productos publicados. Vuelve pronto — estamos incorporando nuevos emprendedores cada semana.</div>`;
    return;
  }
  if (lista.length === 0){
    grid.innerHTML = `<div class="empty-state">No encontramos productos con esos filtros. Prueba ajustando la búsqueda.</div>`;
    return;
  }

  grid.innerHTML = lista.map(p => `
    <article class="card-producto reveal">
      <div class="thumb">
        <img src="${urlImagen(p.imagen_principal_url)}" alt="${escapeHtml(p.nombre)}" loading="lazy">
        ${p.es_exportacion ? '<span class="badge">Exportación</span>' : (p.es_artesanal ? '<span class="badge">Artesanal</span>' : '')}
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${escapeHtml(p.categorias?.nombre || '')}</span><span>${escapeHtml(p.cantones?.nombre || '')}</span></div>
        <h3>${escapeHtml(p.nombre)}</h3>
        <p>${escapeHtml(cortar(p.descripcion_corta, 100))}</p>
        <div class="tag-row">${(p.etiquetas || []).slice(0,3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
        <a href="producto.html?slug=${encodeURIComponent(p.slug)}" class="btn btn-ghost btn-sm">Ver detalles</a>
      </div>
    </article>
  `).join("");
  observeReveals();
}

["fBuscar","fCategoria","fCanton","fTipo"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", renderProductos);
  document.getElementById(id)?.addEventListener("change", renderProductos);
});

/* ---------- Emprendedores ---------- */
async function cargarEmprendedores(){
  const { data, error } = await db
    .from("emprendedores")
    .select("*, cantones(nombre)")
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(6);
  const grid = document.getElementById("empGrid");
  if (error || !data || data.length === 0){
    grid.innerHTML = `<div class="empty-state">Aún no hay emprendedores publicados.</div>`;
    return;
  }
  grid.innerHTML = data.map(e => `
    <article class="card-emp reveal">
      <div class="thumb"><img src="${urlImagen(e.foto_url)}" alt="${escapeHtml(e.nombre)}" loading="lazy"></div>
      <div class="card-body">
        <div class="emprend">${escapeHtml(e.emprendimiento)}</div>
        <h3>${escapeHtml(e.nombre)}</h3>
        <p>${escapeHtml(cortar(e.historia, 110))}</p>
        <div class="card-meta"><span>${escapeHtml(e.cantones?.nombre || '')}</span><span>${e.anios_experiencia ? e.anios_experiencia + ' años' : ''}</span></div>
      </div>
    </article>
  `).join("");
  observeReveals();
}

/* ---------- Noticias ---------- */
const TIPO_LABEL = { feria:"Feria", rueda_negocios:"Rueda de negocios", capacitacion:"Capacitación", convocatoria:"Convocatoria", evento:"Evento" };
async function cargarNoticias(){
  const { data, error } = await db.from("noticias").select("*").eq("activo", true).order("fecha_evento", { ascending: false }).limit(6);
  const grid = document.getElementById("newsGrid");
  if (error || !data || data.length === 0){
    grid.innerHTML = `<div class="empty-state">Aún no hay noticias publicadas.</div>`;
    return;
  }
  grid.innerHTML = data.map(n => `
    <article class="card-news reveal">
      <div class="thumb"><img src="${urlImagen(n.imagen_url)}" alt="${escapeHtml(n.titulo)}" loading="lazy"></div>
      <div class="card-body">
        <span class="tipo">${TIPO_LABEL[n.tipo] || 'Noticia'}</span>
        <h3>${escapeHtml(n.titulo)}</h3>
        <p>${escapeHtml(cortar(n.resumen, 90))}</p>
        ${n.fecha_evento ? `<div class="fecha">${new Date(n.fecha_evento).toLocaleDateString('es-EC', { day:'numeric', month:'long', year:'numeric' })}</div>` : ''}
      </div>
    </article>
  `).join("");
  observeReveals();
}

/* ---------- Estadísticas ---------- */
async function cargarStats(){
  const [emp, prod, cant, cat] = await Promise.all([
    db.from("emprendedores").select("id", { count: "exact", head: true }).eq("activo", true),
    db.from("productos").select("id", { count: "exact", head: true }).eq("activo", true),
    db.from("cantones").select("id", { count: "exact", head: true }),
    db.from("categorias").select("id", { count: "exact", head: true }),
  ]);
  const vals = { emprendedores: emp.count || 0, productos: prod.count || 0, cantones: cant.count || 0, categorias: cat.count || 0 };
  document.querySelectorAll("[data-stat]").forEach(el => { el.textContent = vals[el.dataset.stat] ?? "0"; });
}

/* ---------- Init ---------- */
(async function init(){
  lucide.createIcons();
  await Promise.all([cargarCategorias(), cargarCantones(), cargarProductos(), cargarEmprendedores(), cargarNoticias(), cargarStats()]);
})();
