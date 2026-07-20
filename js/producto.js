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

  const { data: imagenes } = await db
    .from("producto_imagenes")
    .select("*")
    .eq("producto_id", p?.id)
    .order("orden");

  loading.style.display = "none";

  if (error || !p){ notFound.style.display = "block"; return; }

  document.title = `${p.nombre} — Lojanova`;
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
    document.getElementById("empExtra").textContent = [e.cantones?.nombre, e.anios_experiencia ? `${e.anios_experiencia} años de experiencia` : null].filter(Boolean).join(" · ");

    const contactos = document.getElementById("empContactos");
    const items = [];
    if (e.telefono) items.push(`<a href="tel:${e.telefono}"><i data-lucide="phone" class="icon"></i> ${escapeHtml(e.telefono)}</a>`);
    if (e.correo) items.push(`<a href="mailto:${e.correo}"><i data-lucide="mail" class="icon"></i> ${escapeHtml(e.correo)}</a>`);
    if (e.facebook) items.push(`<a href="${e.facebook}" target="_blank" rel="noopener"><i data-lucide="facebook" class="icon"></i> Facebook</a>`);
    if (e.instagram) items.push(`<a href="${e.instagram}" target="_blank" rel="noopener"><i data-lucide="instagram" class="icon"></i> Instagram</a>`);
    if (e.ubicacion) items.push(`<a href="#"><i data-lucide="map-pin" class="icon"></i> ${escapeHtml(e.ubicacion)}</a>`);
    contactos.innerHTML = items.join("");

    const btn = document.getElementById("btnContactar");
    if (e.whatsapp){
      const num = e.whatsapp.replace(/\D/g,"");
      btn.href = `https://wa.me/${num}?text=${encodeURIComponent("Hola, me interesa el producto " + p.nombre + " que vi en Lojanova.")}`;
    } else if (e.correo){
      btn.href = `mailto:${e.correo}?subject=${encodeURIComponent("Interés en " + p.nombre + " — Lojanova")}`;
    } else {
      btn.style.display = "none";
    }
  } else {
    document.getElementById("empSticky").style.display = "none";
  }

  detail.style.display = "grid";
  lucide.createIcons();
}

cargarProducto();
lucide.createIcons();
