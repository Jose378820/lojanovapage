// =========================================================
// LOJANOVA — marca.js
// Carga un emprendedor (marca) por ?id=... junto con todos
// sus productos, y ofrece búsqueda/filtro local dentro de la marca.
// =========================================================

const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", window.scrollY > 40));
document.getElementById("navToggle")?.addEventListener("click", () => document.getElementById("navLinks").classList.toggle("open"));

function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function cortar(str, n){ if(!str) return ""; return str.length > n ? str.slice(0,n).trim() + "…" : str; }
function lnTexto(es, en){
  const lang = localStorage.getItem("ln_lang") || "es";
  return (lang === "en" && en) ? en : es;
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
function observeReveals(){
  document.querySelectorAll(".reveal:not(.visible)").forEach((el, index) => {
    el.style.setProperty("--stagger-delay", `${Math.min(index * 70, 420)}ms`);
    revealObserver.observe(el);
  });
}

const SITE_URL = "https://lojanova.gob.ec";

function setMeta(id, valor){
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === "TITLE") el.textContent = valor;
  else if (el.tagName === "LINK") el.href = valor;
  else el.setAttribute("content", valor);
}

let PRODUCTOS_MARCA = [];
let CATEGORIAS_MARCA = [];

function actualizarSEO(e, id){
  const titulo = `${e.emprendimiento} — Lojanova`;
  const descripcion = cortar(e.historia || `Marca lojana de ${e.cantones?.nombre || "Loja"}, con productos elaborados por ${e.nombre}.`, 160);
  const url = `${SITE_URL}/marca.html?id=${encodeURIComponent(id)}`;
  const imagen = urlImagen(e.foto_url) || `${SITE_URL}/img/og-image.jpg`;

  document.title = titulo;
  setMeta("pageTitle", titulo);
  setMeta("metaDescription", descripcion);
  setMeta("canonicalLink", url);
  setMeta("ogUrl", url);
  setMeta("ogTitle", titulo);
  setMeta("ogDescription", descripcion);
  setMeta("ogImage", imagen);
  setMeta("twitterTitle", titulo);
  setMeta("twitterDescription", descripcion);
  setMeta("twitterImage", imagen);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Brand",
    "name": e.emprendimiento,
    "description": descripcion,
    "image": imagen,
    "url": url,
    "founder": e.nombre ? { "@type": "Person", "name": e.nombre } : undefined,
  };
  const scriptTag = document.getElementById("marcaJsonLd");
  if (scriptTag) scriptTag.textContent = JSON.stringify(jsonLd);
}

async function cargarMarca(){
  const id = new URLSearchParams(location.search).get("id");
  const loading = document.getElementById("loadingState");
  const notFound = document.getElementById("notFoundState");
  const wrap = document.getElementById("marcaWrap");

  if (!id){ loading.style.display = "none"; notFound.style.display = "block"; return; }

  const { data: e, error } = await db
    .from("emprendedores")
    .select("*, cantones(nombre)")
    .eq("id", id)
    .eq("activo", true)
    .single();

  loading.style.display = "none";

  if (error || !e){ notFound.style.display = "block"; return; }

  wrap.style.display = "block";
  actualizarSEO(e, id);

  document.getElementById("bcNombre").textContent = e.emprendimiento;
  document.getElementById("marcaHeroBg").style.backgroundImage = `url(${urlImagen(e.foto_url, "producer")})`;
  document.getElementById("marcaFoto").src = urlImagen(e.foto_url, "producer");
  document.getElementById("marcaFoto").alt = e.emprendimiento;
  document.getElementById("marcaCanton").textContent = e.cantones?.nombre || "Marca lojana";
  document.getElementById("marcaEmprendimiento").textContent = e.emprendimiento;
  document.getElementById("marcaDueno").textContent = e.nombre;

  const stats = document.getElementById("marcaStats");
  const statsItems = [];
  if (e.cantones?.nombre) statsItems.push(`<span><i data-lucide="map-pin" class="icon" style="width:15px;height:15px"></i> ${escapeHtml(e.cantones.nombre)}</span>`);
  if (e.anios_experiencia) statsItems.push(`<span><i data-lucide="award" class="icon" style="width:15px;height:15px"></i> ${e.anios_experiencia} años de experiencia</span>`);
  stats.innerHTML = statsItems.join("");

  const contactos = document.getElementById("marcaContactos");
  const items = [];
  if (e.whatsapp){
    const num = e.whatsapp.replace(/\D/g,"");
    items.push(`<a href="https://wa.me/${num}?text=${encodeURIComponent("Hola, vi su marca " + e.emprendimiento + " en Lojanova.")}" target="_blank" rel="noopener" data-track="contactar_whatsapp_marca"><i data-lucide="message-circle" class="icon"></i> WhatsApp</a>`);
  }
  if (e.telefono) items.push(`<a href="tel:${e.telefono}"><i data-lucide="phone" class="icon"></i> ${escapeHtml(e.telefono)}</a>`);
  if (e.correo) items.push(`<a href="mailto:${e.correo}?subject=${encodeURIComponent("Interés en " + e.emprendimiento + " — Lojanova")}"><i data-lucide="mail" class="icon"></i> Correo</a>`);
  if (e.instagram) items.push(`<a href="${e.instagram}" target="_blank" rel="noopener"><i data-lucide="instagram" class="icon"></i> Instagram</a>`);
  if (e.facebook) items.push(`<a href="${e.facebook}" target="_blank" rel="noopener"><i data-lucide="facebook" class="icon"></i> Facebook</a>`);
  contactos.innerHTML = items.join("");

  if (e.historia){
    document.getElementById("marcaHistoria").textContent = e.historia;
    document.getElementById("marcaHistoriaWrap").style.display = "block";
  }

  await cargarProductosDeMarca(id);
  lucide.createIcons();
}

async function cargarProductosDeMarca(emprendedorId){
  const grid = document.getElementById("marcaProductos");
  const { data, error } = await db
    .from("productos")
    .select("*, categorias(nombre, nombre_en), cantones(nombre)")
    .eq("emprendedor_id", emprendedorId)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0){
    grid.innerHTML = `<div class="empty-state">Esta marca aún no tiene productos publicados.</div>`;
    document.getElementById("marcaTituloProductos").textContent = "Productos";
    return;
  }

  PRODUCTOS_MARCA = data;
  document.getElementById("marcaTituloProductos").textContent = data.length === 1 ? "1 producto" : `${data.length} productos`;

  CATEGORIAS_MARCA = [...new Map(data.filter(p => p.categoria_id).map(p => [p.categoria_id, p.categorias])).entries()];
  const selectCat = document.getElementById("mCategoria");
  selectCat.innerHTML = `<option value="">Categoría</option>` + CATEGORIAS_MARCA.map(([id, cat]) => `<option value="${id}">${escapeHtml(lnTexto(cat?.nombre || '', cat?.nombre_en))}</option>`).join("");
  // Si solo hay una categoría entre los productos, no tiene sentido mostrar el filtro
  selectCat.style.display = CATEGORIAS_MARCA.length > 1 ? "" : "none";

  renderProductosMarca();
}

function renderProductosMarca(){
  const grid = document.getElementById("marcaProductos");
  const q = document.getElementById("mBuscar").value.trim().toLowerCase();
  const cat = document.getElementById("mCategoria").value;

  const lista = PRODUCTOS_MARCA.filter(p => {
    if (cat && p.categoria_id !== cat) return false;
    if (q && !(`${p.nombre} ${p.descripcion_corta}`.toLowerCase().includes(q))) return false;
    return true;
  });

  if (lista.length === 0){
    grid.innerHTML = `<div class="empty-state">No encontramos productos con esos filtros dentro de esta marca.</div>`;
    return;
  }

  grid.innerHTML = lista.map(p => `
    <article class="card-producto reveal">
      <div class="thumb">
        <img src="${escapeHtml(urlImagen(p.imagen_principal_url, "product"))}" alt="${escapeHtml(p.nombre)}" loading="lazy">
        ${p.es_exportacion ? '<span class="badge">Exportación</span>' : (p.es_artesanal ? '<span class="badge">Artesanal</span>' : '')}
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${escapeHtml(lnTexto(p.categorias?.nombre || '', p.categorias?.nombre_en))}</span><span>${escapeHtml(p.cantones?.nombre || '')}</span></div>
        <h3>${escapeHtml(lnTexto(p.nombre, p.nombre_en))}</h3>
        <p>${escapeHtml(cortar(lnTexto(p.descripcion_corta, p.descripcion_corta_en), 100))}</p>
        <div class="tag-row">${(p.etiquetas || []).slice(0,3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
        <a href="producto.html?slug=${encodeURIComponent(p.slug)}" class="btn btn-ghost btn-sm">Ver detalles</a>
      </div>
    </article>
  `).join("");
  observeReveals();
}

["mBuscar","mCategoria"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", renderProductosMarca);
  document.getElementById(id)?.addEventListener("change", renderProductosMarca);
});

cargarMarca();
