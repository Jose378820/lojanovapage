// =========================================================
// LOJANOVA — Tracking de visitas (avanzado)
// Incluir DESPUÉS de supabase-client.js en cada página pública
// =========================================================
(function(){
  function getSessionId(){
    let id = sessionStorage.getItem("ln_session");
    if (!id){ id = crypto.randomUUID(); sessionStorage.setItem("ln_session", id); }
    return id;
  }

  function getDispositivo(){
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "tablet";
    if (/mobile|android|iphone/i.test(ua)) return "mobile";
    return "desktop";
  }

  function getNavegador(){
    const ua = navigator.userAgent;
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Otro";
  }

  function getSO(){
    const ua = navigator.userAgent;
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "macOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Linux")) return "Linux";
    return "Otro";
  }

  function getReferrerDominio(){
    if (!document.referrer) return null;
    try { return new URL(document.referrer).hostname; } catch(e){ return null; }
  }

  function getUTM(){
    const p = new URLSearchParams(location.search);
    return {
      utm_source: p.get("utm_source"),
      utm_medium: p.get("utm_medium"),
      utm_campaign: p.get("utm_campaign"),
    };
  }

  async function getGeo(){
    const cache = sessionStorage.getItem("ln_geo");
    if (cache) return JSON.parse(cache);
    try {
      const res = await fetch("https://ipwho.is/");
      const data = await res.json();
      const geo = { pais: data.country || null, ciudad: data.city || null };
      sessionStorage.setItem("ln_geo", JSON.stringify(geo));
      return geo;
    } catch(e){ return { pais: null, ciudad: null }; }
  }

  const contexto = {
    session_id: getSessionId(),
    dispositivo: getDispositivo(),
    navegador: getNavegador(),
    so: getSO(),
    idioma: navigator.language || null,
    resolucion: `${screen.width}x${screen.height}`,
    conexion: navigator.connection?.effectiveType || null,
    referrer: document.referrer || null,
    referrer_dominio: getReferrerDominio(),
    ...getUTM(),
  };

  async function registrarEvento(tipo, metadata){
    try {
      const geo = await getGeo();
      await db.from("analytics_eventos").insert({
        ...contexto,
        pais: geo.pais,
        ciudad: geo.ciudad,
        pagina: location.pathname + location.search,
        tipo,
        metadata: metadata || {},
      });
    } catch(e){ /* no bloquear la navegación si falla */ }
  }

  // Pageview inicial
  registrarEvento("pageview");

  // Heartbeat cada 30s mientras la pestaña esté visible
  setInterval(() => {
    if (document.visibilityState === "visible") registrarEvento("heartbeat");
  }, 30000);

  // ---- Tiempo en página + profundidad de scroll ----
  const inicio = Date.now();
  let maxScroll = 0;
  window.addEventListener("scroll", () => {
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const pct = alto > 0 ? Math.min(100, Math.round((window.scrollY / alto) * 100)) : 100;
    if (pct > maxScroll) maxScroll = pct;
  }, { passive: true });

  async function registrarSalida(){
    const tiempo_en_pagina = Math.round((Date.now() - inicio) / 1000);
    const geo = JSON.parse(sessionStorage.getItem("ln_geo") || "{}");
    const payload = {
      ...contexto,
      pais: geo.pais || null,
      ciudad: geo.ciudad || null,
      pagina: location.pathname + location.search,
      tipo: "engagement",
      metadata: { tiempo_en_pagina, profundidad_scroll: maxScroll },
    };
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/analytics_eventos`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    } catch(e){ /* silencioso */ }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") registrarSalida(); });
  window.addEventListener("pagehide", registrarSalida);

  // ---- Clics en elementos con data-track="nombre" ----
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (el) registrarEvento("click", { elemento: el.dataset.track });
  });

  window.lnTrackBusqueda = (termino) => registrarEvento("busqueda", { termino });
  window.lnTrackFiltro = (filtro, valor) => registrarEvento("filtro", { filtro, valor });
})();
