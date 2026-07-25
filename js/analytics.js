// =========================================================
// LOJANOVA — Tracking de visitas
// Incluir DESPUÉS de supabase-client.js en cada página pública
// =========================================================
(function(){
  function getSessionId(){
    let id = sessionStorage.getItem("ln_session");
    if (!id){
      id = crypto.randomUUID();
      sessionStorage.setItem("ln_session", id);
    }
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

  async function registrarEvento(tipo){
    try {
      await db.from("analytics_eventos").insert({
        session_id: getSessionId(),
        pagina: location.pathname + location.search,
        tipo,
        referrer: document.referrer || null,
        dispositivo: getDispositivo(),
        navegador: getNavegador()
      });
    } catch(e){ /* no bloquear la navegación si falla */ }
  }

  registrarEvento("pageview");

  // Heartbeat cada 30s mientras la pestaña esté visible (para medir duración)
  setInterval(() => {
    if (document.visibilityState === "visible") registrarEvento("heartbeat");
  }, 30000);
})();
