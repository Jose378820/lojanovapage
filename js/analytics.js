// LOJANOVA — analytics.js
// Registro de visitas públicas compatible con el panel histórico y el panel nuevo.

(function () {
  if (!window.db || location.pathname.startsWith("/admin")) return;

  const SESSION_KEY = "lojanova_visit_session_id";
  const GEO_CACHE_KEY = "lojanova_visit_geo";
  const PAGE_HIT_KEY = `lojanova_last_hit_${location.pathname || "/"}`;
  const now = Date.now();
  const lastSamePageHit = Number(sessionStorage.getItem(PAGE_HIT_KEY) || 0);

  // Evita duplicados por recargas inmediatas, pero permite contar navegación real entre páginas.
  if (now - lastSamePageHit < 5 * 1000) return;
  sessionStorage.setItem(PAGE_HIT_KEY, String(now));

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  function getDeviceType() {
    const ua = navigator.userAgent || "";
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "móvil";
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    return "escritorio";
  }

  function getBrowser() {
    const ua = navigator.userAgent || "";
    if (/Edg/i.test(ua)) return "Edge";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Safari/i.test(ua)) return "Safari";
    return "Otro";
  }

  async function getGeo() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(GEO_CACHE_KEY) || "null");
      if (cached?.pais) return cached;
    } catch (_) {}

    try {
      const response = await fetch("https://ipapi.co/json/", { cache: "no-store" });
      if (!response.ok) throw new Error("geo unavailable");
      const data = await response.json();
      const geo = {
        pais: data.country_name || "No identificado",
        codigo_pais: data.country_code || null,
        ciudad: data.city || "No identificada",
        region: data.region || null,
      };
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
      return geo;
    } catch (error) {
      return { pais: "No identificado", codigo_pais: null, ciudad: "No identificada", region: null };
    }
  }

  async function insertSafely(table, payload) {
    try {
      const { error } = await window.db.from(table).insert(payload);
      if (error) console.warn(`No se pudo registrar en ${table}:`, error.message);
    } catch (error) {
      console.warn(`No se pudo registrar en ${table}:`, error?.message || error);
    }
  }

  async function trackVisit() {
    const geo = await getGeo();
    const pagePath = location.pathname || "/";
    const referrer = document.referrer || null;
    const device = getDeviceType();

    await Promise.all([
      insertSafely("visitas_plataforma", {
        session_id: sessionId,
        pagina: pagePath,
        titulo: document.title || "Lojanova",
        referrer,
        pais: geo.pais,
        codigo_pais: geo.codigo_pais,
        ciudad: geo.ciudad,
        region: geo.region,
        dispositivo: device,
        idioma: navigator.language || null,
        user_agent: navigator.userAgent || null,
      }),
      insertSafely("analytics_eventos", {
        session_id: sessionId,
        pagina: pagePath,
        tipo: "pageview",
        referrer,
        dispositivo: device,
        navegador: getBrowser(),
      }),
    ]);
  }

  if (document.readyState === "complete") trackVisit();
  else window.addEventListener("load", trackVisit, { once: true });
})();
