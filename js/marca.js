// =========================================================
// LOJANOVA — marca.js
// Carga un emprendedor (marca) por ?id=... y todos sus productos
// =========================================================

const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", window.scrollY > 40));
document.getElementById("navToggle")?.addEventListener("click", () => document.getElementById("navLinks").classList.toggle("open"));

function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

function safePhone(value){
  const normalized = String(value || "").trim().replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? normalized : "";
}

function safeEmail(value){
  const email = String(value || "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeSocialUrl(value, allowedDomain){
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    if (host !== allowedDomain && !host.endsWith(`.${allowedDomain}`)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function contactElement({ tag = "a", href = "", icon, label }){
  const element = document.createElement(tag);
  element.className = "marca-contact-btn";
  if (tag === "a") element.href = href;
  if (tag === "a" && /^https?:/i.test(href)) {
    element.target = "_blank";
    element.rel = "noopener noreferrer";
  }
  const iconElement = document.createElement("i");
  iconElement.dataset.lucide = icon;
  iconElement.className = "icon";
  element.append(iconElement, document.createTextNode(` ${label}`));
  return element;
}
function cortar(str, n){ if(!str) return ""; return str.length > n ? str.slice(0,n).trim() + "…" : str; }
function lnTexto(es, en){
  const lang = localStorage.getItem("ln_lang") || "es";
  return (lang === "en" && en) ? en : es;
}

async function cargarMarca(){
  const id = new URLSearchParams(location.search).get("id");
  const loading = document.getElementById("marcaLoading");
  const notFound = document.getElementById("marcaNotFound");
  if (!id){ loading.style.display = "none"; notFound.style.display = "block"; return; }

  const { data: e, error } = await db
    .from("emprendedores")
    .select("*, cantones(nombre)")
    .eq("id", id)
    .eq("activo", true)
    .single();

  if (error || !e){ loading.style.display = "none"; notFound.style.display = "block"; return; }

  loading.style.display = "none";
  document.getElementById("marcaDetalle").style.display = "block";

  document.title = `${e.emprendimiento} — Lojanova`;
  document.getElementById("pageTitle").textContent = `${e.emprendimiento} — Lojanova`;
  const desc = cortar(e.historia || `Marca lojana de ${e.cantones?.nombre || "Loja"}.`, 155);
  document.getElementById("metaDescription").content = desc;
  document.getElementById("ogTitle").content = `${e.emprendimiento} — Lojanova`;
  document.getElementById("ogDescription").content = desc;
  document.getElementById("ogImage").content = urlImagen(e.foto_url, "producer");
  document.getElementById("canonicalLink").href = location.href;

  document.getElementById("bcMarca").textContent = e.emprendimiento;
  document.getElementById("marcaFoto").src = urlImagen(e.foto_url, "producer");
  document.getElementById("marcaFoto").alt = e.emprendimiento;
  document.getElementById("marcaNombreEmprendimiento").textContent = e.emprendimiento;
  document.getElementById("marcaNombreInline").textContent = e.emprendimiento;
  document.getElementById("marcaNombreDueno").textContent = e.nombre;
  document.getElementById("marcaHistoria").textContent = e.historia || "Esta marca aún no ha compartido su historia.";

  const canton = e.cantones?.nombre || "Loja";
  document.getElementById("marcaCanton").innerHTML = `<i data-lucide="map-pin" class="icon"></i> ${escapeHtml(canton)}`;
  document.getElementById("statCanton").textContent = canton;

  if (e.anios_experiencia){
    document.getElementById("marcaExperiencia").style.display = "flex";
    document.getElementById("marcaExperiencia").innerHTML = `<i data-lucide="award" class="icon"></i> ${e.anios_experiencia} años`;
    document.getElementById("statExperiencia").textContent = e.anios_experiencia;
  } else {
    document.getElementById("statExperiencia").textContent = "—";
  }

  const contactos = document.getElementById("marcaContactos");
  const items = [];
  const whatsapp = safePhone(e.whatsapp);
  const telefono = safePhone(e.telefono);
  const correo = safeEmail(e.correo);
  const instagram = safeSocialUrl(e.instagram, "instagram.com");
  const facebook = safeSocialUrl(e.facebook, "facebook.com");

  if (whatsapp) {
    const link = contactElement({ href: `https://wa.me/${whatsapp.replace(/\D/g, "")}`, icon: "message-circle", label: "WhatsApp" });
    link.dataset.track = "contactar_whatsapp_marca";
    items.push(link);
  }
  if (telefono) items.push(contactElement({ href: `tel:${telefono}`, icon: "phone", label: e.telefono }));
  if (correo) items.push(contactElement({ href: `mailto:${encodeURIComponent(correo)}`, icon: "mail", label: "Enviar correo" }));
  if (e.ubicacion) items.push(contactElement({ tag: "span", icon: "map-pin", label: String(e.ubicacion) }));
  if (instagram) items.push(contactElement({ href: instagram, icon: "instagram", label: "Instagram" }));
  if (facebook) items.push(contactElement({ href: facebook, icon: "facebook", label: "Facebook" }));

  if (items.length) {
    contactos.replaceChildren(...items);
  } else {
    const empty = document.createElement("p");
    empty.style.cssText = "font-size:.85rem;color:#888";
    empty.textContent = "Sin datos de contacto públicos.";
    contactos.replaceChildren(empty);
  }

  document.getElementById("btnCompartir")?.addEventListener("click", async () => {
    const shareData = { title: e.emprendimiento, text: `Descubre ${e.emprendimiento} en Lojanova`, url: location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch(err){} }
    else { await navigator.clipboard.writeText(location.href); alert("Link copiado al portapapeles"); }
  });

  await cargarProductosDeMarca(id);
  if (window.lucide) lucide.createIcons();
  window.lojanovaRefreshTranslation?.();
}

async function cargarProductosDeMarca(emprendedorId){
  const grid = document.getElementById("marcaProductos");
  const { data, error } = await db
    .from("productos")
    .select("*, categorias(nombre, nombre_en), cantones(nombre)")
    .eq("emprendedor_id", emprendedorId)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  const total = (data || []).length;
  document.getElementById("statProductos").textContent = total;
  document.getElementById("marcaProductosCount").textContent = total === 1 ? "1 producto" : `${total} productos`;

  if (error || total === 0){
    grid.innerHTML = `<div class="empty-state">Esta marca aún no tiene productos publicados.</div>`;
    return;
  }

  grid.innerHTML = data.map(p => `
    <article class="card-producto reveal visible">
      <div class="thumb">
        <img src="${escapeHtml(urlImagen(p.imagen_principal_url, "product"))}" alt="${escapeHtml(lnTexto(p.nombre, p.nombre_en))}" loading="lazy">
        ${p.es_exportacion ? '<span class="badge">Exportación</span>' : (p.es_artesanal ? '<span class="badge">Artesanal</span>' : '')}
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${escapeHtml(lnTexto(p.categorias?.nombre || '', p.categorias?.nombre_en))}</span><span>${escapeHtml(p.cantones?.nombre || '')}</span></div>
        <h3>${escapeHtml(lnTexto(p.nombre, p.nombre_en))}</h3>
        <p>${escapeHtml(cortar(lnTexto(p.descripcion_corta, p.descripcion_corta_en), 100))}</p>
        <a href="producto.html?slug=${encodeURIComponent(p.slug)}" class="btn btn-ghost btn-sm">Ver detalles</a>
      </div>
    </article>
  `).join("");
  window.lojanovaRefreshTranslation?.();
}

cargarMarca();


