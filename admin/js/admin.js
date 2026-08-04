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
/* =========================================================
   ANALÍTICAS
   ========================================================= */

async function cargarAnaliticas(){
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const numberOrZero = (value) => Number(value || 0);
  const formatoNumero = (value) => Number(value || 0).toLocaleString("es-EC");
  const formatoDuracion = (segundos) => {
    const total = Math.max(0, Math.round(Number(segundos || 0)));
    const minutos = Math.floor(total / 60);
    const resto = total % 60;
    return minutos ? `${minutos} min ${resto}s` : `${resto}s`;
  };
  const valorFila = (row, fields) => {
    for (const field of fields){
      if (row && row[field] !== undefined && row[field] !== null && row[field] !== "") return row[field];
    }
    return "—";
  };
  const totalFila = (row) => numberOrZero(valorFila(row, ["visitas", "total", "count", "conteo", "eventos", "cantidad", "clics"]));
  const cargarSeguro = async (nombre, consulta) => {
    try{
      const res = await consulta;
      if (res.error) throw res.error;
      return res;
    }catch(error){
      console.warn(`No se pudo cargar ${nombre}:`, error);
      return { data: [], count: 0, error };
    }
  };
  const setTabla = (id, rows, columnas, emptyText) => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    const lista = Array.isArray(rows) ? rows : [];
    if (!lista.length){
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${columnas.length}">${emptyText || "Sin datos disponibles."}</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(row => `<tr>${columnas.map(col => {
      const value = typeof col.value === "function" ? col.value(row) : row[col.value];
      return `<td>${escapeHtml(String(value ?? "—"))}</td>`;
    }).join("")}</tr>`).join("");
  };
  const pintarGrafico = (id, type, labels, values, label) => {
    try{
      if (typeof renderChart === "function") renderChart(id, type, labels, values, label);
    }catch(error){
      console.warn(`No se pudo renderizar ${id}:`, error);
    }
  };

  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const desde30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    traficoOrigenes,
    traficoMesRaw,
    visitasHoy,
    sesiones30d,
    visitasDiarias,
    horasPico,
    paginasTop,
    dispositivos,
    duracionSesiones,
    navegadores,
    sistemasOperativos,
    paises,
    ciudades,
    busquedas,
    clicsCta,
    productosTop,
    tiemposPagina,
    tasaRebote,
    scrollEventos,
    productosRes,
    emprendedoresRes,
    noticiasRes,
  ] = await Promise.all([
    cargarSeguro("origen del tráfico", db.from("vista_origenes_trafico").select("*")),
    cargarSeguro("tráfico mensual desde eventos", db.from("analytics_eventos").select("id", { count: "exact", head: true }).eq("tipo", "pageview").gte("creado_en", inicioMes)),
    cargarSeguro("visitas de hoy", db.from("analytics_eventos").select("id", { count: "exact", head: true }).eq("tipo", "pageview").gte("creado_en", inicioHoy)),
    cargarSeguro("visitantes únicos", db.from("analytics_eventos").select("session_id").eq("tipo", "pageview").gte("creado_en", desde30Dias).limit(10000)),
    cargarSeguro("visitas por día", db.from("vista_visitas_diarias").select("*")),
    cargarSeguro("horas pico", db.from("vista_horas_pico").select("*")),
    cargarSeguro("páginas más visitadas", db.from("vista_paginas_top").select("*")),
    cargarSeguro("dispositivos", db.from("vista_dispositivos").select("*")),
    cargarSeguro("duración de sesiones", db.from("vista_duracion_sesiones").select("*")),
    cargarSeguro("navegadores", db.from("vista_navegadores").select("*")),
    cargarSeguro("sistemas operativos", db.from("vista_sistemas_operativos").select("*")),
    cargarSeguro("países", db.from("vista_paises").select("*")),
    cargarSeguro("ciudades", db.from("vista_ciudades").select("*")),
    cargarSeguro("búsquedas", db.from("vista_terminos_busqueda").select("*")),
    cargarSeguro("clics CTA", db.from("vista_clics_cta").select("*")),
    cargarSeguro("productos más vistos", db.from("vista_productos_mas_vistos").select("*")),
    cargarSeguro("tiempo por página", db.from("vista_tiempo_por_pagina").select("*")),
    cargarSeguro("tasa de rebote", db.from("vista_tasa_rebote").select("*")),
    cargarSeguro("scroll promedio", db.from("analytics_eventos").select("metadata, scroll_porcentaje").eq("tipo", "scroll").gte("creado_en", desde30Dias).limit(10000)),
    cargarSeguro("productos", db.from("productos").select("id, activo, categorias(nombre), cantones(nombre), emprendedores!inner(id, activo, estado)")),
    cargarSeguro("emprendedores", db.from("emprendedores").select("id, activo, estado")),
    cargarSeguro("noticias", db.from("noticias").select("id, activo")),
  ]);

  const totalPorOrigen = (traficoOrigenes.data || []).reduce((sum, row) => sum + totalFila(row), 0);
  const traficoMensual = totalPorOrigen || numberOrZero(traficoMesRaw.count);
  setText("kpiTraficoMensual", formatoNumero(traficoMensual));
  setText("kpiTraficoMensualAnaliticas", formatoNumero(traficoMensual));
  setText("execPageviewsMes", formatoNumero(traficoMensual));

  setText("kpiVisitasHoy", formatoNumero(visitasHoy.count || 0));
  const visitantesUnicos = new Set((sesiones30d.data || []).map(row => row.session_id).filter(Boolean)).size;
  setText("kpiVisitantesUnicos", formatoNumero(visitantesUnicos));

  const paginaTop = (paginasTop.data || [])[0];
  setText("kpiPaginaTop", paginaTop ? String(valorFila(paginaTop, ["pagina", "path", "url", "nombre"])) : "—");

  const duraciones = duracionSesiones.data || [];
  const duracionPromedio = duraciones.length
    ? duraciones.reduce((sum, row) => sum + numberOrZero(valorFila(row, ["duracion_promedio", "duracion_segundos", "duracion", "promedio"])), 0) / duraciones.length
    : 0;
  setText("kpiDuracionProm", duracionPromedio ? formatoDuracion(duracionPromedio) : "—");

  const reboteRow = Array.isArray(tasaRebote.data) ? tasaRebote.data[0] : tasaRebote.data;
  const reboteValor = reboteRow ? numberOrZero(valorFila(reboteRow, ["tasa_rebote", "rebote", "porcentaje", "rate"])) : null;
  setText("kpiTasaRebote", reboteValor !== null ? `${Math.round(reboteValor * (reboteValor <= 1 ? 100 : 1) * 10) / 10}%` : "—");

  const scrollValores = (scrollEventos.data || []).map(row => {
    const direct = row.scroll_porcentaje;
    const meta = row.metadata || {};
    return Number(direct ?? meta.scroll_porcentaje ?? meta.scrollPercent ?? meta.maxScroll ?? 0);
  }).filter(value => Number.isFinite(value) && value > 0);
  const scrollPromedio = scrollValores.length ? Math.round(scrollValores.reduce((sum, value) => sum + value, 0) / scrollValores.length) : null;
  setText("kpiScrollProm", scrollPromedio !== null ? `${scrollPromedio}%` : "—");

  const diarias = visitasDiarias.data || [];
  pintarGrafico("chartVisitasDiarias", "line", diarias.map(row => String(valorFila(row, ["fecha", "dia", "created_at"]))), diarias.map(totalFila), "Visitas");
  const horas = horasPico.data || [];
  pintarGrafico("chartHoras", "bar", horas.map(row => String(valorFila(row, ["hora", "hour"]))) , horas.map(totalFila), "Visitas");
  const disp = dispositivos.data || [];
  pintarGrafico("chartDispositivos", "doughnut", disp.map(row => String(valorFila(row, ["dispositivo", "device"]))) , disp.map(totalFila), "Visitas");
  const navs = navegadores.data || [];
  pintarGrafico("chartNavegadores", "bar", navs.map(row => String(valorFila(row, ["navegador", "browser"]))) , navs.map(totalFila), "Visitas");
  const sistemas = sistemasOperativos.data || [];
  pintarGrafico("chartSO", "doughnut", sistemas.map(row => String(valorFila(row, ["sistema_operativo", "sistema", "so", "os"]))) , sistemas.map(totalFila), "Visitas");

  setTabla("tablaPaginasTop", paginasTop.data, [
    { value: row => valorFila(row, ["pagina", "path", "url", "nombre"]) },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay páginas registradas.");
  setTabla("tablaProductosTop", productosTop.data, [
    { value: row => valorFila(row, ["producto", "nombre_producto", "nombre", "titulo"]) },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay productos vistos.");
  setTabla("tablaPaises", paises.data, [
    { value: row => valorFila(row, ["pais", "country"]) },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay países registrados.");
  setTabla("tablaCiudades", ciudades.data, [
    { value: row => valorFila(row, ["ciudad", "city"]) },
    { value: row => valorFila(row, ["pais", "country"]) },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay ciudades registradas.");
  setTabla("tablaOrigenes", traficoOrigenes.data, [
    { value: row => valorFila(row, ["origen", "referrer", "fuente", "source"]) || "Directo" },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay origen de tráfico registrado.");
  setTabla("tablaBusquedas", busquedas.data, [
    { value: row => valorFila(row, ["termino", "busqueda", "query", "keyword"]) },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay búsquedas registradas.");
  setTabla("tablaClics", clicsCta.data, [
    { value: row => valorFila(row, ["cta", "accion", "nombre", "boton"]) },
    { value: row => formatoNumero(totalFila(row)) },
  ], "Aún no hay clics registrados.");

  const productosVisibles = (productosRes.data || []).filter(p =>
    p.activo && p.emprendedores?.activo && p.emprendedores?.estado === "aprobado"
  );
  const emprendedores = emprendedoresRes.data || [];
  const aprobados = emprendedores.filter(e => e.activo && e.estado === "aprobado").length;
  const pendientes = emprendedores.filter(e => e.estado === "pendiente" || !e.estado).length;
  const rechazados = emprendedores.filter(e => e.estado === "rechazado").length;
  const noticias = (noticiasRes.data || []).filter(n => n.activo).length;

  setText("analyticsProductos", formatoNumero(productosVisibles.length));
  setText("analyticsMarcas", formatoNumero(aprobados));
  setText("analyticsPendientes", formatoNumero(pendientes));
  setText("analyticsNoticias", formatoNumero(noticias));

  if (typeof renderAnalyticsBars === "function"){
    renderAnalyticsBars("analyticsCategorias", contarPor(productosVisibles, p => p.categorias?.nombre));
    renderAnalyticsBars("analyticsCantones", contarPor(productosVisibles, p => p.cantones?.nombre));
    renderAnalyticsBars("analyticsEstados", {
      "Aprobados": aprobados,
      "Pendientes": pendientes,
      "Rechazados": rechazados,
    });
  }

  const resumen = document.getElementById("analyticsResumen");
  if (resumen){
    const promedio = aprobados ? (productosVisibles.length / aprobados).toFixed(1) : "0";
    resumen.innerHTML = `
      <p><strong>${formatoNumero(traficoMensual)}</strong> visitas totales se han registrado en el mes.</p>
      <p><strong>${productosVisibles.length}</strong> productos visibles pertenecen a marcas aprobadas.</p>
      <p><strong>${aprobados}</strong> marcas están activas y aprobadas; <strong>${pendientes}</strong> solicitudes requieren revisión.</p>
      <p>Promedio actual: <strong>${promedio}</strong> productos por marca aprobada.</p>
    `;
  }

  if (typeof cargarAnaliticasApp === "function"){
    try { await cargarAnaliticasApp(); } catch(error){ console.warn("No se pudieron cargar analíticas de app:", error); }
  }
}


const CHART_INSTANCES = {};
function renderChart(canvasId, type, data){
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (CHART_INSTANCES[canvasId]) CHART_INSTANCES[canvasId].destroy();
  CHART_INSTANCES[canvasId] = new Chart(ctx, { type, data, options: { responsive: true, plugins: { legend: { display: type === "doughnut" } } } });
}







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
  await Promise.all([cargarKPIs(), cargarProductos(), cargarEmprendedores(), cargarCategorias(), cargarNoticias(), cargarCantones(), cargarSolicitudes(), cargarAnaliticas()]);
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
      <td><img class="thumb-sm" src="${escapeHtml(p.imagen_principal_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20')}" alt=""></td>
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
  document.getElementById("p_nombre_en").value = p.nombre_en || "";
  document.getElementById("p_desc_corta_en").value = p.descripcion_corta_en || "";
  document.getElementById("p_desc_larga_en").value = p.descripcion_larga_en || "";
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
    nombre_en: document.getElementById("p_nombre_en").value.trim() || null,
    descripcion_corta_en: document.getElementById("p_desc_corta_en").value.trim() || null,
    descripcion_larga_en: document.getElementById("p_desc_larga_en").value.trim() || null,
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
      <td><img class="thumb-sm" src="${escapeHtml(e.foto_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20')}" alt=""></td>
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
      <td><img class="thumb-sm" src="${escapeHtml(c.imagen_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20')}" alt=""></td>
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
  document.getElementById("c_nombre_en").value = c.nombre_en || "";
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
    nombre_en: document.getElementById("c_nombre_en").value.trim() || null,
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
      <td><img class="thumb-sm" src="${escapeHtml(n.imagen_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20')}" alt=""></td>
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
   SOLICITUDES DE PRODUCTORES (Edge Functions)
   ========================================================= */
async function llamarEdgeFunction(nombre, payload){
  const { data: { session } } = await db.auth.getSession();
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${nombre}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Ocurrió un error inesperado.");
  return data;
}

async function cargarSolicitudes(){
  const { data, error } = await db.from("emprendedores").select("*, cantones(nombre)").order("created_at", { ascending: false });
  const tPend = document.getElementById("tablaSolicitudes");
  const tHist = document.getElementById("tablaHistorialSolicitudes");
  if (error || !data){
    tPend.innerHTML = `<tr class="empty-row"><td colspan="6">No se pudieron cargar las solicitudes.</td></tr>`;
    return;
  }

  const pendientes = data.filter(e => e.estado === "pendiente" || !e.estado);
  const historial = data.filter(e => e.estado === "aprobado" || e.estado === "rechazado");

  tPend.innerHTML = pendientes.length ? pendientes.map(e => `
    <tr>
      <td><img class="thumb-sm" src="${escapeHtml(e.foto_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20')}" alt=""></td>
      <td>${escapeHtml(e.nombre)}</td>
      <td>${escapeHtml(e.emprendimiento)}</td>
      <td>${escapeHtml(e.correo || '—')}</td>
      <td>${new Date(e.created_at).toLocaleDateString('es-EC')}</td>
      <td class="row-actions">
        <button class="btn btn-primary btn-sm" onclick="aprobarSolicitud('${e.id}')">Aprobar</button>
        <button class="btn btn-outline btn-sm" onclick="rechazarSolicitud('${e.id}')">Rechazar</button>
      </td>
    </tr>
  `).join("") : `<tr class="empty-row"><td colspan="6">No hay solicitudes pendientes.</td></tr>`;

  tHist.innerHTML = historial.length ? historial.map(e => `
    <tr>
      <td><img class="thumb-sm" src="${escapeHtml(e.foto_url || 'https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20')}" alt=""></td>
      <td>${escapeHtml(e.nombre)}</td>
      <td>${escapeHtml(e.emprendimiento)}</td>
      <td><span class="status-pill ${e.estado === 'aprobado' ? 'on' : 'off'}">${e.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}</span></td>
      <td class="row-actions">
        <button class="btn btn-danger btn-sm" onclick="eliminarSolicitud('${e.id}','${escapeHtml(e.nombre)}')">Eliminar cuenta</button>
      </td>
    </tr>
  `).join("") : `<tr class="empty-row"><td colspan="5">Aún no hay historial.</td></tr>`;
}

window.aprobarSolicitud = async function(id){
  try{
    await llamarEdgeFunction("aprobar-productor", { emprendedor_id: id });
    cargarSolicitudes(); cargarEmprendedores(); cargarKPIs(); cargarListasBase();
  }catch(err){ alert("No se pudo aprobar: " + err.message); }
};

window.rechazarSolicitud = async function(id){
  if (!confirm("¿Rechazar esta solicitud? El productor no verá sus productos publicados.")) return;
  try{
    await llamarEdgeFunction("rechazar-productor", { emprendedor_id: id });
    cargarSolicitudes(); cargarKPIs();
  }catch(err){ alert("No se pudo rechazar: " + err.message); }
};

window.eliminarSolicitud = async function(id, nombre){
  if (!confirm(`¿Eliminar por completo a "${nombre}"? Esto borra su perfil, sus productos y su acceso al sistema. No se puede deshacer.`)) return;
  try{
    await llamarEdgeFunction("eliminar-productor", { emprendedor_id: id });
    cargarSolicitudes(); cargarEmprendedores(); cargarKPIs(); cargarListasBase();
  }catch(err){ alert("No se pudo eliminar: " + err.message); }
};

/* =========================================================
   CANTONES (solo lectura desde el panel — vienen precargados)
   ========================================================= */
async function cargarCantones(){
  const { data, error } = await db.from("cantones").select("*").order("orden");
  const tbody = document.getElementById("tablaCantones");
  if (error || !data || data.length === 0){ tbody.innerHTML = `<tr class="empty-row"><td colspan="2">Sin datos.</td></tr>`; return; }
  tbody.innerHTML = data.map(c => `<tr><td>${escapeHtml(c.nombre)}</td><td>${c.orden ?? 0}</td></tr>`).join("");
}



