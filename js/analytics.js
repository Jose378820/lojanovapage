// LOJANOVA — analíticas públicas robustas
// Conserva la compatibilidad histórica y mejora la medición de eventos nuevos.
(function () {
  "use strict";
  if (!window.db || location.pathname.startsWith("/admin")) return;

  const SESSION_KEY = "lojanova_visit_session_id";
  const SESSION_ACTIVITY_KEY = "lojanova_visit_session_activity";
  const GEO_CACHE_KEY = "lojanova_visit_geo";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const MAX_ENGAGEMENT_SECONDS = 30 * 60;
  const startedAt = performance.now();
  let maxScroll = 0;
  let lastEngagementSent = 0;

  const makeId = () => crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function currentSession() {
    const now = Date.now();
    const lastActivity = Number(localStorage.getItem(SESSION_ACTIVITY_KEY) || 0);
    let id = localStorage.getItem(SESSION_KEY);
    if (!id || (lastActivity && now - lastActivity > SESSION_TIMEOUT_MS)) {
      id = makeId();
      localStorage.setItem(SESSION_KEY, id);
    }
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
    return id;
  }

  const sessionId = currentSession();

  function pageIdentity() {
    const params = new URLSearchParams(location.search);
    const identity = new URLSearchParams();
    if (params.get("slug")) identity.set("slug", params.get("slug"));
    else if (params.get("id")) identity.set("id", params.get("id"));
    const query = identity.toString();
    return `${location.pathname || "/"}${query ? `?${query}` : ""}`;
  }

  const pagePath = pageIdentity();

  function getDeviceType() {
    const ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "móvil";
    return "escritorio";
  }

  function getBrowser() {
    const ua = navigator.userAgent || "";
    if (/Edg/i.test(ua)) return "Edge";
    if (/OPR|Opera/i.test(ua)) return "Opera";
    if (/Chrome|CriOS/i.test(ua)) return "Chrome";
    if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
    if (/Safari/i.test(ua)) return "Safari";
    return "Otro";
  }

  function getOperatingSystem() {
    const ua = navigator.userAgent || "";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Mac OS/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Otro";
  }

  function referrerDomain() {
    if (!document.referrer) return null;
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      return host === location.hostname.replace(/^www\./, "") ? "Interno" : host;
    } catch (_) { return null; }
  }

  function campaignData() {
    const params = new URLSearchParams(location.search);
    return {
      utm_source: params.get("utm_source")?.slice(0, 120) || null,
      utm_medium: params.get("utm_medium")?.slice(0, 120) || null,
      utm_campaign: params.get("utm_campaign")?.slice(0, 160) || null,
    };
  }

  async function getGeo() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(GEO_CACHE_KEY) || "null");
      if (cached?.pais) return cached;
    } catch (_) {}
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch("https://ipapi.co/json/", { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
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
    } catch (_) {
      return { pais: "No identificado", codigo_pais: null, ciudad: "No identificada", region: null };
    }
  }

  async function insertSafely(table, payload) {
    try {
      const { error } = await window.db.from(table).insert(payload);
      if (error) console.warn(`No se pudo registrar en ${table}:`, error.message);
      return !error;
    } catch (error) {
      console.warn(`No se pudo registrar en ${table}:`, error?.message || error);
      return false;
    }
  }

  function baseEvent(tipo, metadata = {}) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      session_id: sessionId,
      pagina: pagePath,
      tipo,
      referrer: document.referrer?.slice(0, 500) || null,
      referrer_dominio: referrerDomain(),
      dispositivo: getDeviceType(),
      navegador: getBrowser(),
      so: getOperatingSystem(),
      idioma: navigator.language || null,
      resolucion: `${screen.width}x${screen.height}`,
      conexion: connection?.effectiveType || null,
      ...campaignData(),
      metadata,
    };
  }

  async function trackEvent(tipo, metadata = {}) {
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
    return insertSafely("analytics_eventos", baseEvent(tipo, metadata));
  }

  async function trackPageview() {
    const dedupeKey = `lojanova_last_hit_${pagePath}`;
    const now = Date.now();
    const lastHit = Number(sessionStorage.getItem(dedupeKey) || 0);
    if (now - lastHit < 10 * 1000) return;
    sessionStorage.setItem(dedupeKey, String(now));
    const geo = await getGeo();
    const event = { ...baseEvent("pageview"), pais: geo.pais, ciudad: geo.ciudad };
    await Promise.all([
      insertSafely("analytics_eventos", event),
      insertSafely("visitas_plataforma", {
        session_id: sessionId, pagina: pagePath, titulo: document.title || "Lojanova",
        referrer: document.referrer || null, pais: geo.pais, codigo_pais: geo.codigo_pais,
        ciudad: geo.ciudad, region: geo.region, dispositivo: getDeviceType(),
        idioma: navigator.language || null, user_agent: navigator.userAgent || null,
      }),
    ]);
  }

  function updateScroll() {
    const scrollable = Math.max(document.documentElement.scrollHeight - innerHeight, 0);
    const percent = scrollable ? Math.round((scrollY / scrollable) * 100) : 100;
    maxScroll = Math.max(maxScroll, Math.min(percent, 100));
  }

  function sendEngagement(force = false) {
    updateScroll();
    const seconds = Math.min(Math.round((performance.now() - startedAt) / 1000), MAX_ENGAGEMENT_SECONDS);
    if (seconds < 10 || (!force && seconds - lastEngagementSent < 45)) return;
    lastEngagementSent = seconds;
    trackEvent("engagement", { tiempo_en_pagina: seconds, profundidad_scroll: maxScroll, visible: !document.hidden });
  }

  let searchTimer;
  document.addEventListener("input", event => {
    if (event.target?.id !== "fBuscar") return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const term = event.target.value.trim().toLowerCase().slice(0, 100);
      if (term.length >= 2) trackEvent("busqueda", { termino: term });
    }, 800);
  });

  document.addEventListener("change", event => {
    const filters = { fCategoria: "categoría", fCanton: "cantón", fTipo: "tipo" };
    const filter = filters[event.target?.id];
    if (filter && event.target.value) trackEvent("filtro", { filtro: filter, valor: String(event.target.value).slice(0, 100) });
  });

  document.addEventListener("click", event => {
    const target = event.target.closest?.("a,button");
    if (!target) return;
    const href = target.getAttribute("href") || "";
    const meaningful = /^(tel:|mailto:|https:\/\/wa\.me)/i.test(href)
      || /btnContactar|newsRegistration|shareNews|installAppBtn|mobileAppDownload/.test(target.id)
      || target.matches("[data-analytics]");
    if (!meaningful) return;
    const label = target.dataset.analytics || target.id || target.getAttribute("aria-label")
      || target.textContent.trim().replace(/\s+/g, " ").slice(0, 80) || "acción";
    trackEvent("click", { elemento: label });
  });

  window.addEventListener("scroll", updateScroll, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) sendEngagement(true); });
  window.addEventListener("pagehide", () => sendEngagement(true));
  setTimeout(() => sendEngagement(true), 15 * 1000);
  setInterval(() => sendEngagement(false), 60 * 1000);

  window.lojanovaAnalytics = Object.freeze({ track: trackEvent });
  if (document.readyState === "complete") trackPageview();
  else window.addEventListener("load", trackPageview, { once: true });
})();
