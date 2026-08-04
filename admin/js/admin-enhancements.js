// =========================================================
// LOJANOVA ADMIN — mejoras institucionales seguras
// Agrega experiencia ejecutiva sin reemplazar métricas existentes.
// =========================================================
(function(){
  const state = { productos: [], emprendedores: [], categorias: [], noticias: [], contactos: [], auditoria: [] };
  const $ = (id) => document.getElementById(id);
  const safe = (value) => escapeHtml(String(value ?? ""));

  function setText(id, value){ const el = $(id); if (el) el.textContent = value; }
  function csvEscape(value){ return `"${String(value ?? "").replace(/"/g,'""')}"`; }
  function downloadCsv(filename, rows){
    const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  function titleFromView(view){
    const btn = document.querySelector(`.sidebar [data-view="${view}"]`);
    return btn ? btn.textContent.trim().replace(/\d+$/, "") : "Resumen";
  }

  function enhanceNavigation(){
    document.querySelectorAll(".sidebar nav button[data-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        setText("currentViewTitle", titleFromView(btn.dataset.view));
        loadView(btn.dataset.view);
      });
    });
    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); $("globalAdminSearch")?.focus();
      }
    });
  }

  async function loadBaseData(){
    const [productos, emprendedores, categorias, noticias] = await Promise.all([
      db.from("productos").select("id,nombre,slug,activo,categoria_id,canton_id,emprendedor_id,created_at"),
      db.from("emprendedores").select("id,nombre,emprendimiento,correo,estado,activo,canton_id,created_at"),
      db.from("categorias").select("id,nombre,orden"),
      db.from("noticias").select("id,titulo,tipo,activo,created_at"),
    ]);
    state.productos = productos.data || [];
    state.emprendedores = emprendedores.data || [];
    state.categorias = categorias.data || [];
    state.noticias = noticias.data || [];
  }

  async function loadExecutiveDashboard(){
    try{
      const today = new Date().toISOString().slice(0,10);
      const [pageviews, visitors, clics] = await Promise.all([
        db.from("analytics_eventos").select("id", { count:"exact", head:true }).eq("tipo", "pageview").gte("creado_en", today),
        db.from("analytics_eventos").select("session_id").eq("tipo", "pageview").gte("creado_en", today).limit(5000),
        db.from("vista_clics_cta").select("*")
      ]);
      const unique = new Set((visitors.data || []).map(v => v.session_id).filter(Boolean)).size;
      const totalClics = (clics.data || []).reduce((sum, item) => sum + Number(item.clics || 0), 0);
      const pendientes = state.emprendedores.filter(e => !e.estado || e.estado === "pendiente").length;
      setText("execUnicosHoy", unique || "—");
      setText("execPageviewsHoy", pageviews.count ?? "—");
      setText("execContactos", totalClics || "—");
      setText("execPendientes", pendientes);
      setText("notificationCount", pendientes);
      addBadge("solicitudes", pendientes);
    }catch(error){ console.warn("No se pudo cargar resumen ejecutivo:", error); }
  }

  function addBadge(view, count){
    const btn = document.querySelector(`.sidebar [data-view="${view}"]`);
    if (!btn) return;
    let badge = btn.querySelector(".badge");
    if (!badge) { badge = document.createElement("span"); badge.className = "badge"; btn.appendChild(badge); }
    badge.textContent = count;
    badge.hidden = !count;
  }

  function setupSearch(){
    const input = $("globalAdminSearch"); const box = $("globalSearchResults");
    if (!input || !box) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (q.length < 2){ box.hidden = true; return; }
      const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const results = [
        ...state.productos.filter(p => norm(p.nombre).includes(q) || norm(p.slug).includes(q)).slice(0,6).map(p => ["Producto", p.nombre, "productos"]),
        ...state.emprendedores.filter(e => norm(e.nombre).includes(q) || norm(e.emprendimiento).includes(q) || norm(e.correo).includes(q)).slice(0,6).map(e => ["Emprendedor", `${e.nombre} · ${e.emprendimiento}`, "emprendedores"]),
        ...state.categorias.filter(c => norm(c.nombre).includes(q)).slice(0,4).map(c => ["Categoría", c.nombre, "categorias"]),
        ...state.noticias.filter(n => norm(n.titulo).includes(q)).slice(0,4).map(n => ["Noticia", n.titulo, "noticias"]),
      ].slice(0,12);
      box.innerHTML = results.length ? results.map(([type,label,view]) => `<button class="search-result" data-go="${view}"><strong>${safe(label)}</strong><span>${type}</span></button>`).join("") : `<div class="notice-item"><strong>Sin resultados</strong><span>Intenta con otro término.</span></div>`;
      box.hidden = false;
    });
    box.addEventListener("click", (event) => {
      const item = event.target.closest("[data-go]"); if (!item) return;
      document.querySelector(`.sidebar [data-view="${item.dataset.go}"]`)?.click();
      box.hidden = true; input.value = "";
    });
    document.addEventListener("click", (event) => { if (!box.contains(event.target) && event.target !== input) box.hidden = true; });
  }

  async function loadContactos(){
    const tbody = $("tablaContactosComerciales"); if (!tbody) return;
    const { data, error } = await db.from("vista_clics_cta").select("*");
    if (error){ tbody.innerHTML = `<tr class="empty-row"><td colspan="2">No se pudieron cargar los contactos.</td></tr>`; return; }
    state.contactos = data || [];
    const total = state.contactos.reduce((sum, item) => sum + Number(item.clics || 0), 0);
    const by = (word) => state.contactos.filter(i => String(i.elemento || "").toLowerCase().includes(word)).reduce((s,i)=>s+Number(i.clics||0),0);
    setText("contactosTotal", total); setText("contactosWhatsapp", by("whatsapp")); setText("contactosEmail", by("mail") + by("correo")); setText("contactosTelefono", by("tel"));
    tbody.innerHTML = state.contactos.length ? state.contactos.map(c => `<tr><td>${safe(c.elemento)}</td><td>${c.clics}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="2">Aún no hay contactos registrados.</td></tr>`;
  }

  async function loadUsuarios(){
    const tbody = $("tablaUsuariosPermisos"); if (!tbody) return;
    const { data, error } = await db.from("admins").select("id, rol, created_at");
    if (error){ tbody.innerHTML = `<tr class="empty-row"><td colspan="3">No se pudo consultar la tabla admins o el campo rol no existe.</td></tr>`; return; }
    tbody.innerHTML = (data || []).length ? data.map(u => `<tr><td>${safe(u.id)}</td><td>${safe(u.rol || "Administrador")}</td><td><span class="status-pill on">Activo</span></td></tr>`).join("") : `<tr class="empty-row"><td colspan="3">Sin administradores visibles.</td></tr>`;
  }

  async function loadAuditoria(){
    const tbody = $("tablaAuditoria"); if (!tbody) return;
    const { data, error } = await db.from("audit_logs").select("created_at,user_id,action,module,result").order("created_at", { ascending:false }).limit(100);
    if (error){ tbody.innerHTML = `<tr class="empty-row"><td colspan="5">La auditoría todavía no está habilitada en Supabase. No se muestran datos simulados.</td></tr>`; return; }
    state.auditoria = data || [];
    tbody.innerHTML = state.auditoria.length ? state.auditoria.map(a => `<tr><td>${new Date(a.created_at).toLocaleString("es-EC")}</td><td>${safe(a.user_id)}</td><td>${safe(a.action)}</td><td>${safe(a.module)}</td><td>${safe(a.result || "Registrado")}</td></tr>`).join("") : `<tr class="empty-row"><td colspan="5">Aún no hay registros de auditoría.</td></tr>`;
  }

  async function loadSalud(){
    const grid = $("healthGrid"); if (!grid) return;
    const checks = [];
    const check = async (name, fn) => { try { await fn(); checks.push([name,"Operativo","operational"]); } catch(error){ checks.push([name, error.message || "No disponible", "warning"]); } };
    await check("Base de datos", () => db.from("productos").select("id", { count:"exact", head:true }));
    await check("Autenticación", () => db.auth.getSession());
    await check("Analíticas", () => db.from("analytics_eventos").select("id", { count:"exact", head:true }));
    await check("Almacenamiento", () => db.storage.from("lojanova-imagenes").list("", { limit:1 }));
    grid.innerHTML = checks.map(([name,status,cls]) => `<div class="health-card ${cls}"><strong>${name}</strong><span>${status}</span></div>`).join("");
  }

  function setupNotifications(){
    const btn = $("btnNotifications"); const drawer = $("notificationDrawer");
    if (!btn || !drawer) return;
    btn.addEventListener("click", () => {
      const pendientes = state.emprendedores.filter(e => !e.estado || e.estado === "pendiente").length;
      drawer.innerHTML = `
        <div class="notice-item"><strong>${pendientes} solicitudes pendientes</strong><span>Revisión de productores.</span></div>
        <div class="notice-item"><strong>Analíticas activas</strong><span>Se conservan las vistas históricas actuales.</span></div>
        <div class="notice-item"><strong>Copias de seguridad</strong><span>Verifica respaldo gestionado en Supabase.</span></div>`;
      drawer.hidden = !drawer.hidden;
    });
  }

  function setupTheme(){
    const apply = () => document.body.classList.toggle("admin-dark", localStorage.getItem("lojanova_admin_theme") === "dark");
    const toggle = () => { localStorage.setItem("lojanova_admin_theme", document.body.classList.contains("admin-dark") ? "light" : "dark"); apply(); };
    apply(); $("btnTheme")?.addEventListener("click", toggle); $("btnThemeSettings")?.addEventListener("click", toggle);
  }

  function setupExports(){
    const exportMap = {
      resumen: () => [["Métrica","Valor"],["Productos", $("kpiProductos")?.textContent],["Emprendedores", $("kpiEmprendedores")?.textContent],["Categorías", $("kpiCategorias")?.textContent],["Noticias", $("kpiNoticias")?.textContent]],
      productos: () => [["ID","Nombre","Activo","Creado"], ...state.productos.map(p => [p.id,p.nombre,p.activo,p.created_at])],
      emprendedores: () => [["ID","Nombre","Emprendimiento","Estado","Activo"], ...state.emprendedores.map(e => [e.id,e.nombre,e.emprendimiento,e.estado,e.activo])],
      contactos: () => [["Elemento","Clics"], ...state.contactos.map(c => [c.elemento,c.clics])],
      auditoria: () => [["Fecha","Usuario","Acción","Módulo","Resultado"], ...state.auditoria.map(a => [a.created_at,a.user_id,a.action,a.module,a.result])],
    };
    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-export]"); if (!btn) return;
      const key = btn.dataset.export; const rows = exportMap[key]?.();
      if (rows) downloadCsv(`lojanova-${key}-${new Date().toISOString().slice(0,10)}.csv`, rows);
    });
    $("btnQuickExport")?.addEventListener("click", () => downloadCsv(`lojanova-resumen-${new Date().toISOString().slice(0,10)}.csv`, exportMap.resumen()));
  }

  function loadView(view){
    if (view === "contactos") loadContactos();
    if (view === "usuarios") loadUsuarios();
    if (view === "auditoria") loadAuditoria();
    if (view === "salud") loadSalud();
  }

  window.addEventListener("load", async () => {
    try{
      enhanceNavigation(); setupSearch(); setupNotifications(); setupTheme(); setupExports();
      await loadBaseData(); await loadExecutiveDashboard();
      $("btnRevisarSalud")?.addEventListener("click", loadSalud);
      lucide?.createIcons?.();
    }catch(error){ console.warn("Mejoras admin no inicializadas:", error); setText("realtimeStatus", "Conexión parcial"); }
  });
})();

