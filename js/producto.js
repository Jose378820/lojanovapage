// =========================================================
// LOJANOVA — producto.js
// Carga el detalle de un producto por su slug (?slug=...)
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

function setBloque(id, valor){
  const el = document.getElementById(id);
  const bloque = el.closest(".pd-block");
  if (!valor){ bloque.style.display = "none"; return; }
  el.textContent = valor;
}

function agregarDato(dl, label, valor){
  if (!valor) return;
  const div = document.createElement("div");
  div.className = "pd-dato";
  div.innerHTML = `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(valor)}</dd>`;
  dl.appendChild(div);
}

function setProductMeta(id, value, attribute = "content"){
  const element = document.getElementById(id);
  if (element && value) element.setAttribute(attribute, value);
}

async function cargarProducto(){
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const loading = document.getElementById("loadingState");
  const notFound = document.getElementById("notFoundState");
  const detail = document.getElementById("productDetail");

  if (!slug){ loading.style.display = "none"; notFound.style.display = "block"; return; }

  const { data: p, error } = await db
    .from("productos")
    .select("*, categorias(nombre), cantones(nombre), emprendedores(*, cantones(nombre))")
    .eq("slug", slug)
    .eq("activo", true)
    .single();

  loading.style.display = "none";

  if (error || !p){ notFound.style.display = "block"; return; }

  const { data: imagenes } = await db
    .from("producto_imagenes")
    .select("*")
    .eq("producto_id", p.id)
    .order("orden");

  document.title = `${p.nombre} — Lojanova`;
  const canonicalUrl = `${location.origin}${location.pathname}?slug=${encodeURIComponent(p.slug || slug)}`;
  const metaDescription = (p.descripcion_corta || p.descripcion_larga || `Conoce ${p.nombre} en Lojanova.`).slice(0, 160);
  const socialImage = urlImagen(p.imagen_principal_url);
  setProductMeta("productMetaDescription", metaDescription);
  setProductMeta("productCanonical", canonicalUrl, "href");
  setProductMeta("productOgTitle", document.title);
  setProductMeta("productOgDescription", metaDescription);
  setProductMeta("productOgImage", socialImage);
  setProductMeta("productOgUrl", canonicalUrl);
  document.getElementById("bcNombre").textContent = p.nombre;
  document.getElementById("metaCategoria").textContent = p.categorias?.nombre || "";
  document.getElementById("metaCanton").textContent = p.cantones?.nombre || "";
  document.getElementById("nombreProducto").textContent = p.nombre;

  document.getElementById("tagRow").innerHTML = (p.etiquetas || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");

  // Galería
  const todasImgs = [p.imagen_principal_url, ...(imagenes || []).map(i => i.imagen_url)].filter(Boolean);
  const imgPrincipal = document.getElementById("imgPrincipal");
  imgPrincipal.src = urlImagen(todasImgs[0]);
  imgPrincipal.alt = p.nombre;
  const thumbs = document.getElementById("galleryThumbs");
  thumbs.innerHTML = todasImgs.map((url, i) => `<img src="${urlImagen(url)}" data-i="${i}" class="${i===0?'active':''}" alt="Imagen ${i+1} de ${escapeHtml(p.nombre)}">`).join("");
  thumbs.querySelectorAll("img").forEach(img => {
    img.addEventListener("click", () => {
      imgPrincipal.src = img.src;
      thumbs.querySelectorAll("img").forEach(t => t.classList.remove("active"));
      img.classList.add("active");
    });
  });

  setBloque("descLarga", p.descripcion_larga || p.descripcion_corta);
  setBloque("historia", p.historia);
  setBloque("proceso", p.proceso_elaboracion);

  const dl = document.getElementById("fichaTecnica");
  agregarDato(dl, "Ingredientes / materiales", p.ingredientes);
  agregarDato(dl, "Certificaciones", p.certificaciones);
  agregarDato(dl, "Capacidad de producción", p.capacidad_produccion);
  agregarDato(dl, "Presentación", p.presentacion);
  agregarDato(dl, "Peso", p.peso);
  agregarDato(dl, "Disponibilidad", p.disponibilidad);
  agregarDato(dl, "Mercados", p.mercados);
  agregarDato(dl, "Tipo de emprendimiento", p.tipo_emprendimiento);
  if (!dl.children.length) document.getElementById("bloqueDatos").style.display = "none";

  // Emprendedor
  const e = p.emprendedores;
  if (e){
    document.getElementById("empFoto").src = urlImagen(e.foto_url);
    document.getElementById("empFoto").alt = e.nombre;
    document.getElementById("empNombre").textContent = e.nombre;
    document.getElementById("empEmprendimiento").textContent = e.emprendimiento;
    document.getElementById("empLink").href = `marca.html?id=${e.id}`;
    document.getElementById("empVerMarca").href = `marca.html?id=${e.id}`;
    document.getElementById("empExtra").textContent = [e.cantones?.nombre, e.anios_experiencia ? `${e.anios_experiencia} años de experiencia` : null].filter(Boolean).join(" · ");

    const contactos = document.getElementById("empContactos");
    const items = [];
    const telefono = safePhone(e.telefono);
    const correo = safeEmail(e.correo);
    const facebook = safeSocialUrl(e.facebook, "facebook.com");
    const instagram = safeSocialUrl(e.instagram, "instagram.com");
    if (telefono) items.push(contactElement({ href: `tel:${telefono}`, icon: "phone", label: e.telefono }));
    if (correo) items.push(contactElement({ href: `mailto:${encodeURIComponent(correo)}`, icon: "mail", label: correo }));
    if (facebook) items.push(contactElement({ href: facebook, icon: "facebook", label: "Facebook" }));
    if (instagram) items.push(contactElement({ href: instagram, icon: "instagram", label: "Instagram" }));
    if (e.ubicacion) items.push(contactElement({ tag: "span", icon: "map-pin", label: String(e.ubicacion) }));
    contactos.replaceChildren(...items);

    const btn = document.getElementById("btnContactar");
    const whatsapp = safePhone(e.whatsapp);
    if (whatsapp){
      const num = whatsapp.replace(/\D/g,"");
      btn.href = `https://wa.me/${num}?text=${encodeURIComponent("Hola, me interesa el producto " + p.nombre + " que vi en Lojanova.")}`;
    } else if (correo){
      btn.href = `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent("Interés en " + p.nombre + " — Lojanova")}`;
    } else {
      btn.style.display = "none";
    }
  } else {
    document.getElementById("empSticky").style.display = "none";
  }

  detail.style.display = "grid";
  lucide.createIcons();
  window.lojanovaRefreshTranslation?.();
}

cargarProducto();
lucide.createIcons();


