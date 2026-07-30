// =========================================================
// LOJANOVA â€” marca.js
// Carga un emprendedor (marca) por ?id=... y todos sus productos
// =========================================================

const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", window.scrollY > 40));
document.getElementById("navToggle")?.addEventListener("click", () => document.getElementById("navLinks").classList.toggle("open"));

function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function cortar(str, n){ if(!str) return ""; return str.length > n ? str.slice(0,n).trim() + "â€¦" : str; }
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

  document.title = `${e.emprendimiento} â€” Lojanova`;
  document.getElementById("pageTitle").textContent = `${e.emprendimiento} â€” Lojanova`;
  const desc = cortar(e.historia || `Marca lojana de ${e.cantones?.nombre || "Loja"}.`, 155);
  document.getElementById("metaDescription").content = desc;
  document.getElementById("ogTitle").content = `${e.emprendimiento} â€” Lojanova`;
  document.getElementById("ogDescription").content = desc;
  document.getElementById("ogImage").content = urlImagen(e.foto_url, "producer");
  document.getElementById("canonicalLink").href = location.href;

  document.getElementById("bcMarca").textContent = e.emprendimiento;
  document.getElementById("marcaFoto").src = urlImagen(e.foto_url, "producer");
  document.getElementById("marcaFoto").alt = e.emprendimiento;
  document.getElementById("marcaNombreEmprendimiento").textContent = e.emprendimiento;
  document.getElementById("marcaNombreInline").textContent = e.emprendimiento;
  document.getElementById("marcaNombreDueno").textContent = e.nombre;
  document.getElementById("marcaHistoria").textContent = e.historia || "Esta marca aÃºn no ha compartido su historia.";

  const canton = e.cantones?.nombre || "Loja";
  document.getElementById("marcaCanton").innerHTML = `<i data-lucide="map-pin" class="icon"></i> ${escapeHtml(canton)}`;
  document.getElementById("statCanton").textContent = canton;

  if (e.anios_experiencia){
    document.getElementById("marcaExperiencia").style.display = "flex";
    document.getElementById("marcaExperiencia").innerHTML = `<i data-lucide="award" class="icon"></i> ${e.anios_experiencia} aÃ±os`;
    document.getElementById("statExperiencia").textContent = e.anios_experiencia;
  } else {
    document.getElementById("statExperiencia").textContent = "â€”";
  }

  const contactos = document.getElementById("marcaContactos");
  const items = [];
  if (e.whatsapp){
    const num = e.whatsapp.replace(/\D/g,"");
    items.push(`<a href="https://wa.me/${num}" target="_blank" rel="noopener" class="marca-contact-btn" data-track="contactar_whatsapp_marca"><i data-lucide="message-circle" class="icon"></i> WhatsApp</a>`);
  }
  if (e.telefono) items.push(`<a href="tel:${e.telefono}" class="marca-contact-btn"><i data-lucide="phone" class="icon"></i> ${escapeHtml(e.telefono)}</a>`);
  if (e.correo) items.push(`<a href="mailto:${e.correo}" class="marca-contact-btn"><i data-lucide="mail" class="icon"></i> Enviar correo</a>`);
  if (e.instagram) items.push(`<a href="${e.instagram}" target="_blank" rel="noopener" class="marca-contact-btn"><i data-lucide="instagram" class="icon"></i> Instagram</a>`);
  if (e.facebook) items.push(`<a href="${e.facebook}" target="_blank" rel="noopener" class="marca-contact-btn"><i data-lucide="facebook" class="icon"></i> Facebook</a>`);
  contactos.innerHTML = items.length ? items.join("") : `<p style="font-size:.85rem;color:#888">Sin datos de contacto pÃºblicos.</p>`;

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
    grid.innerHTML = `<div class="empty-state">Esta marca aÃºn no tiene productos publicados.</div>`;
    return;
  }

  grid.innerHTML = data.map(p => `
    <article class="card-producto reveal visible">
      <div class="thumb">
        <img src="${escapeHtml(urlImagen(p.imagen_principal_url, "product"))}" alt="${escapeHtml(lnTexto(p.nombre, p.nombre_en))}" loading="lazy">
        ${p.es_exportacion ? '<span class="badge">ExportaciÃ³n</span>' : (p.es_artesanal ? '<span class="badge">Artesanal</span>' : '')}
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


