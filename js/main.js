// =========================================================
// LOJANOVA — main.js
// Interacciones de la landing + carga de datos desde Supabase
// =========================================================

/* ---------- Navbar ---------- */
const navbar = document.getElementById("navbar");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const isCoarseMobile = window.matchMedia("(max-width: 900px), (hover: none), (pointer: coarse)").matches;

function setNavbarState() {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}
setNavbarState();
window.addEventListener("scroll", setNavbarState, { passive: true });
navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});
navLinks?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  navLinks.classList.remove("open");
  document.body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
}));

/* ---------- Hero slider + movimiento ---------- */
const heroSlides = [...document.querySelectorAll(".hero-bg")];
const heroDots = [...document.querySelectorAll(".hero-dots span")];
let activeHeroSlide = 0;
if (heroSlides.length > 1) {
  setInterval(() => {
    heroSlides[activeHeroSlide].classList.remove("is-active");
    heroDots[activeHeroSlide]?.classList.remove("is-active");
    activeHeroSlide = (activeHeroSlide + 1) % heroSlides.length;
    heroSlides[activeHeroSlide].classList.add("is-active");
    heroDots[activeHeroSlide]?.classList.add("is-active");
  }, 5200);
}

/* ---------- Parallax liviano ---------- */
let ticking = false;
function updateParallax() {
  if (isCoarseMobile) return;
  const viewportCenter = window.innerHeight / 2;
  document.querySelectorAll("[data-parallax-section]").forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const offset = (rect.top + rect.height / 2 - viewportCenter) * -0.08;
    section.style.setProperty("--parallax-y", `${Math.max(-36, Math.min(36, offset))}px`);
  });
  ticking = false;
}
function requestParallax() {
  if (isCoarseMobile) return;
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateParallax);
}
if (!isCoarseMobile) {
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax);
  requestParallax();
}

/* ---------- Scroll reveal ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
function observeReveals(){
  document.querySelectorAll(".reveal:not(.visible)").forEach((el, index) => {
    el.style.setProperty("--stagger-delay", `${Math.min(index * 70, 420)}ms`);
    revealObserver.observe(el);
  });
}
observeReveals();

/* ---------- Cards 3D sutiles ---------- */
function enhanceProductTilt(){
  if (isCoarseMobile) return;
  document.querySelectorAll(".card-producto:not([data-tilt-ready])").forEach(card => {
    card.dataset.tiltReady = "true";
    card.addEventListener("pointermove", event => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.classList.add("is-tilting");
      card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-6px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.transform = "";
    });
  });
}

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
      <img src="${urlImagenCategoria(c.imagen_url, c.nombre)}" alt="${escapeHtml(c.nombre)}" loading="lazy">
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
    .select("*, categorias(nombre), cantones(nombre), emprendedores(id, nombre, emprendimiento, foto_url, historia)")
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

  const marcas = new Map();
  lista.forEach(producto => {
    const emprendedor = producto.emprendedores;
    const marcaId = emprendedor?.id || producto.emprendedor_id || producto.id;
    if (!marcas.has(marcaId)) {
      marcas.set(marcaId, {
        id: emprendedor?.id,
        nombre: emprendedor?.emprendimiento || producto.nombre,
        productor: emprendedor?.nombre || "",
        historia: emprendedor?.historia || producto.descripcion_corta || "",
        canton: producto.cantones?.nombre || "",
        categoria: producto.categorias?.nombre || "",
        imagen: producto.imagen_principal_url || emprendedor?.foto_url,
        exportacion: !!producto.es_exportacion,
        artesanal: !!producto.es_artesanal,
        productos: []
      });
    }

    const marca = marcas.get(marcaId);
    marca.productos.push(producto);
    if (!marca.imagen && producto.imagen_principal_url) marca.imagen = producto.imagen_principal_url;
    if (producto.es_exportacion) marca.exportacion = true;
    if (producto.es_artesanal) marca.artesanal = true;
  });

  grid.innerHTML = [...marcas.values()].map(marca => {
    const total = marca.productos.length;
    const etiqueta = total === 1 ? "producto" : "productos";
    const href = marca.id ? `marca.html?id=${encodeURIComponent(marca.id)}` : "#catalogo";
    return `
    <a href="${href}" class="card-producto card-marca-catalogo reveal" style="text-decoration:none;color:inherit">
      <div class="thumb">
        <img src="${urlImagen(marca.imagen, "product")}" alt="${escapeHtml(marca.nombre)}" loading="lazy">
        <span class="badge marca-product-count">${total} ${etiqueta}</span>
        ${marca.exportacion ? '<span class="badge badge-secondary">Exportación</span>' : (marca.artesanal ? '<span class="badge badge-secondary">Artesanal</span>' : '')}
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${escapeHtml(marca.categoria)}</span><span>${escapeHtml(marca.canton)}</span></div>
        <h3>${escapeHtml(marca.nombre)}</h3>
        ${marca.productor ? `<div class="marca-owner">Por ${escapeHtml(marca.productor)}</div>` : ""}
        <p>${escapeHtml(cortar(marca.historia, 115))}</p>
        <span class="btn btn-ghost btn-sm">Ver marca y productos</span>
      </div>
    </a>`;
  }).join("");
  observeReveals();
  enhanceProductTilt();
  window.lojanovaRefreshTranslation?.();
}

["fBuscar","fCategoria","fCanton","fTipo"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", renderProductos);
  document.getElementById(id)?.addEventListener("change", renderProductos);
});

/* ---------- Emprendedores ---------- */
async function cargarEmprendedores(){
  const grid = document.getElementById("empGrid");
  if (!grid) return;

  const { data, error } = await db
    .from("emprendedores")
    .select("*, cantones(nombre)")
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error || !data || data.length === 0){
    grid.innerHTML = `<div class="empty-state">Aún no hay marcas publicadas.</div>`;
    return;
  }

  const { data: prods } = await db.from("productos").select("emprendedor_id").eq("activo", true);
  const conteos = {};
  (prods || []).forEach(p => { conteos[p.emprendedor_id] = (conteos[p.emprendedor_id] || 0) + 1; });

  grid.innerHTML = data.map(e => {
    const totalProductos = conteos[e.id] || 0;
    const etiqueta = totalProductos === 1 ? "producto" : "productos";
    return `
    <a href="marca.html?id=${encodeURIComponent(e.id)}" class="card-emp reveal" style="text-decoration:none;color:inherit;display:block">
      <div class="thumb">
        <img src="${urlImagen(e.foto_url, "producer")}" alt="${escapeHtml(e.emprendimiento || e.nombre)}" loading="lazy">
        <span class="marca-count-badge">${totalProductos} ${etiqueta}</span>
        <span class="hover-cta"><i data-lucide="arrow-right" class="icon" style="width:14px;height:14px"></i> Ver catálogo completo</span>
      </div>
      <div class="card-body">
        <div class="emprend">${escapeHtml(e.emprendimiento)}</div>
        <h3>${escapeHtml(e.nombre)}</h3>
        <p>${escapeHtml(cortar(e.historia, 110))}</p>
        <div class="card-meta"><span>${escapeHtml(e.cantones?.nombre || "")}</span><span>${e.anios_experiencia ? e.anios_experiencia + " años" : ""}</span></div>
      </div>
    </a>`;
  }).join("");

  if (window.lucide) lucide.createIcons();
  observeReveals();
  window.lojanovaRefreshTranslation?.();
}

/* ---------- Noticias ---------- */
const TIPO_LABEL = { feria:"Feria", rueda_negocios:"Rueda de negocios", capacitacion:"Capacitación", convocatoria:"Convocatoria", evento:"Evento", taller:"Taller", seminario:"Seminario", conferencia:"Conferencia", lanzamiento:"Lanzamiento", festival:"Festival", otro:"Otro" };
function fechaNoticia(value){
  return value ? new Date(value + "T12:00:00").toLocaleDateString("es-EC", { day:"numeric", month:"long", year:"numeric" }) : "";
}
function enlaceNoticia(n){
  return n.slug ? `noticia.html?slug=${encodeURIComponent(n.slug)}` : `noticia.html?id=${encodeURIComponent(n.id)}`;
}
function estadoEvento(fecha){
  if (!fecha) return null;
  const hoy = new Date();
  const hoyLocal = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  if (fecha === hoyLocal) return { texto:"Hoy", clase:"hoy" };
  return fecha > hoyLocal
    ? { texto:"Próximo evento", clase:"proximo" }
    : { texto:"Evento finalizado", clase:"finalizado" };
}
async function cargarNoticias(){
  const { data, error } = await db.from("noticias").select("*").eq("activo", true).order("fecha_evento", { ascending: false }).limit(8);
  const grid = document.getElementById("newsGrid");
  const destacadas = window.LOJANOVA_NOTICIAS_DESTACADAS || [];
  const noticias = (error ? destacadas : (data || []))
    .sort((a,b) => String(b.fecha_evento || "").localeCompare(String(a.fecha_evento || "")));
  if (noticias.length === 0){
    grid.innerHTML = `<div class="empty-state">Aún no hay noticias publicadas.</div>`;
    return;
  }
  grid.innerHTML = noticias.map(n => {
    const image = n.imagen_url?.startsWith("assets/") ? n.imagen_url : urlImagen(n.imagen_url, "news");
    const estado = estadoEvento(n.fecha_evento);
    return `
    <a href="${enlaceNoticia(n)}" target="_blank" rel="noopener" class="card-news news-card-link reveal" aria-label="Abrir noticia: ${escapeHtml(n.titulo)}">
      <div class="thumb"><img src="${escapeHtml(image)}" alt="${escapeHtml(n.titulo)}" loading="lazy">${estado ? `<span class="news-event-status ${estado.clase}">${estado.texto}</span>` : ""}<span class="news-open-icon"><i data-lucide="arrow-up-right"></i></span></div>
      <div class="card-body">
        <span class="tipo">${TIPO_LABEL[n.tipo] || 'Noticia'}</span>
        <h3>${escapeHtml(n.titulo)}</h3>
        <p>${escapeHtml(cortar(n.resumen || n.subtitulo, 115))}</p>
        <div class="news-card-footer">${n.fecha_evento ? `<span class="fecha"><i data-lucide="calendar-days"></i> ${fechaNoticia(n.fecha_evento)}</span>` : ''}<strong>Leer más <i data-lucide="arrow-right"></i></strong></div>
      </div>
    </a>`;
  }).join("");
  observeReveals();
  lucide.createIcons();
}

/* ---------- Estadísticas ---------- */
async function cargarStats(){
  const [owners, prod, cant, cat] = await Promise.all([
    db.from("productos").select("emprendedor_id").eq("activo", true),
    db.from("productos").select("id", { count: "exact", head: true }).eq("activo", true),
    db.from("cantones").select("id", { count: "exact", head: true }),
    db.from("categorias").select("id", { count: "exact", head: true }),
  ]);
  const emprendedoresVisibles = new Set((owners.data || []).map(item => item.emprendedor_id).filter(Boolean)).size;
  const vals = { emprendedores: emprendedoresVisibles, productos: prod.count || 0, cantones: cant.count || 0, categorias: cat.count || 0 };
  document.querySelectorAll("[data-stat]").forEach(el => { el.textContent = vals[el.dataset.stat] ?? "0"; });
  const heroProductos = document.getElementById("heroProductos");
  const heroEmp = document.getElementById("heroEmp");
  if (heroProductos) heroProductos.textContent = vals.productos;
  if (heroEmp) heroEmp.textContent = vals.emprendedores;
}

/* ---------- Init ---------- */
(async function init(){
  lucide.createIcons();
  await Promise.all([cargarCategorias(), cargarCantones(), cargarProductos(), cargarNoticias(), cargarStats()]);
  window.lojanovaRefreshTranslation?.();
})();

