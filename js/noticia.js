"use strict";
const $ = id => document.getElementById(id);
const escapeNewsHtml = value => String(value || "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
const newsDate = value => value ? new Date(value + "T12:00:00").toLocaleDateString("es-EC", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) : "";
const normalizeNews = item => ({
  ...item,
  slug: item.slug || "",
  subtitulo: item.subtitulo || "",
  hora: item.hora || "",
  lugar: item.lugar || "",
  direccion: item.direccion || "",
  organizacion: item.organizacion || "",
  introduccion: item.introduccion || item.contenido || item.resumen || "",
  temario: item.temario || [],
  secciones: item.secciones || [],
  galeria: item.galeria || [],
  cifras: item.cifras || []
});

async function loadNewsDetail(){
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const id = params.get("id");
  let item = null;

  if (slug) {
    const { data, error } = await db.from("noticias").select("*").eq("slug", slug).eq("activo", true).maybeSingle();
    if (!error) item = data;
    if (error) item = (window.LOJANOVA_NOTICIAS_DESTACADAS || []).find(news => news.slug === slug);
  }

  if (!item && id) {
    const { data, error } = await db.from("noticias").select("*").eq("id", id).eq("activo", true).maybeSingle();
    if (!error) item = data;
  }

  $("newsLoading").hidden = true;
  if (!item) {
    $("newsNotFound").hidden = false;
    return;
  }

  const news = normalizeNews(item);
  const image = news.imagen_url?.startsWith("assets/") ? news.imagen_url : urlImagen(news.imagen_url, "news");
  document.title = news.titulo + " — Lojanova";
  $("newsTitle").textContent = news.titulo;
  $("newsSubtitle").textContent = news.subtitulo || news.resumen;
  $("newsType").textContent = ({capacitacion:"Capacitación",evento:"Evento",feria:"Feria",convocatoria:"Convocatoria",rueda_negocios:"Rueda de negocios",taller:"Taller",seminario:"Seminario",conferencia:"Conferencia",lanzamiento:"Lanzamiento",festival:"Festival",otro:"Otro"})[news.tipo] || "Noticia";
  $("newsDate").textContent = newsDate(news.fecha_evento);
  $("newsHeroImage").src = image;
  $("newsHeroImage").alt = news.titulo;
  $("newsIntro").textContent = news.introduccion;

  if (news.cifras.length) {
    $("newsStats").innerHTML = news.cifras.map(cifra => `<article><strong>${escapeNewsHtml(cifra.valor)}</strong><span>${escapeNewsHtml(cifra.etiqueta)}</span></article>`).join("");
  } else {
    $("newsStats").hidden = true;
  }

  const facts = [
    ["calendar-days", "Fecha", newsDate(news.fecha_evento)],
    ["clock-3", "Hora", news.hora],
    ["map-pinned", "Lugar", news.lugar],
    ["navigation", "Dirección", news.direccion]
  ].filter(([, , value]) => value);
  $("newsFacts").innerHTML = facts.map(([icon,label,value]) => `<div class="news-fact"><i data-lucide="${icon}"></i><div><span>${escapeNewsHtml(label)}</span><strong>${escapeNewsHtml(value)}</strong></div></div>`).join("");

  if (news.organizacion) {
    $("newsOrganization").textContent = news.organizacion;
  } else {
    $("newsOrganizationBlock").hidden = true;
  }

  const inlinePhotos = news.galeria.slice(0, news.secciones.length);
  if (news.secciones.length) {
    $("newsSections").innerHTML = news.secciones.map((section,index) => {
      const photo = inlinePhotos[index];
      const src = photo ? (photo.url?.startsWith("assets/") ? photo.url : urlImagen(photo.url, "news")) : "";
      return `<section class="news-story-block ${photo ? "has-image" : "text-only"}"><div class="news-story-copy"><span class="news-section-number">${String(index+1).padStart(2,"0")}</span><h2>${escapeNewsHtml(section.titulo)}</h2><p>${escapeNewsHtml(section.contenido)}</p></div>${photo ? `<figure class="${/visitas-|visitantes-|respuesta-/.test(photo.url || "") ? "is-data" : ""}"><img src="${escapeNewsHtml(src)}" alt="${escapeNewsHtml(photo.descripcion || section.titulo)}" loading="lazy"><figcaption>${escapeNewsHtml(photo.descripcion || "Archivo institucional")}</figcaption></figure>` : ""}</section>`;
    }).join("");
  } else {
    $("newsSections").hidden = true;
  }

  const remainingPhotos = news.galeria.slice(inlinePhotos.length);
  if (remainingPhotos.length) {
    $("newsGallery").innerHTML = remainingPhotos.map((photo,index) => {
      const src = photo.url?.startsWith("assets/") ? photo.url : urlImagen(photo.url, "news");
      return `<figure class="${index === 0 ? "featured" : ""}"><img src="${escapeNewsHtml(src)}" alt="${escapeNewsHtml(photo.descripcion || news.titulo)}" loading="lazy"><figcaption>${escapeNewsHtml(photo.descripcion || "Archivo institucional")}</figcaption></figure>`;
    }).join("");
  } else {
    $("newsGalleryBlock").hidden = true;
  }

  if (news.temario.length) {
    $("newsAgenda").innerHTML = news.temario.map((entry,index) => `<article><span>${String(index+1).padStart(2,"0")}</span><div><h3>${escapeNewsHtml(entry.titulo)}</h3><p>${escapeNewsHtml(entry.detalle)}</p></div></article>`).join("");
  } else {
    $("newsAgendaBlock").hidden = true;
  }

  $("newsArticle").hidden = false;
  lucide.createIcons();
}

$("shareNews")?.addEventListener("click", async () => {
  const data = { title: document.title, text: $("newsSubtitle").textContent, url: location.href };
  if (navigator.share) {
    try { await navigator.share(data); } catch (_) {}
  } else {
    await navigator.clipboard.writeText(location.href);
    const button = $("shareNews");
    const previous = button.innerHTML;
    button.textContent = "Enlace copiado";
    setTimeout(() => { button.innerHTML = previous; lucide.createIcons(); }, 1800);
  }
});

$("navToggle")?.addEventListener("click", () => {
  const links = $("navLinks");
  const isOpen = links?.classList.toggle("open") || false;
  $("navToggle").setAttribute("aria-expanded", String(isOpen));
});

$("navLinks")?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  $("navLinks").classList.remove("open");
  $("navToggle")?.setAttribute("aria-expanded", "false");
}));

loadNewsDetail();
lucide.createIcons();
