let deferredInstallPrompt = null;
let refreshingApp = false;

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 900px), (hover: none), (pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function showInstallControls() {
  if (!isMobileDevice() || isStandaloneMode()) return;
  document.querySelectorAll("[data-install-app], .mobile-app-download").forEach(button => {
    button.hidden = false;
    button.classList.add("is-visible");
    button.style.removeProperty("display");
  });
}

function hideInstallControlsAfterInstall() {
  document.querySelectorAll("[data-install-app], .mobile-app-download").forEach(button => {
    button.hidden = true;
    button.classList.remove("is-visible");
  });
}


function getAppInstallSource() {
  const path = location.pathname || "/";
  if (path === "/" || path.endsWith("/index.html")) return "Inicio / Hero";
  if (path.includes("producto")) return "Ficha de producto";
  if (path.includes("marca")) return "Página de marca";
  if (path.includes("login")) return "Portal productores";
  if (path.includes("registro")) return "Registro de productores";
  if (path.includes("mi-panel")) return "Panel del productor";
  return path;
}

function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "móvil";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "escritorio";
}

async function trackAppInstallEvent(kind, control = "Botón de descarga") {
  try {
    if (!window.db) return;
    const sessionId = localStorage.getItem("lojanova_visit_session_id") || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem("lojanova_visit_session_id", sessionId);

    const source = getAppInstallSource();
    await window.db.from("visitas_plataforma").insert({
      session_id: sessionId,
      pagina: `/app-${kind}${location.pathname || "/"}`,
      titulo: `${kind === "instalada" ? "App instalada" : "Clic descargar app"} - ${source} - ${control}`,
      referrer: document.referrer || null,
      dispositivo: getDeviceType(),
      idioma: navigator.language || null,
      user_agent: navigator.userAgent || null,
    });
  } catch (error) {
    console.warn("No se pudo registrar evento de app:", error?.message || error);
  }
}
function showManualInstallHelp() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  alert(isIOS
    ? "Para instalar Lojanova en iPhone: abre esta página en Safari, toca Compartir y elige ‘Agregar a pantalla de inicio’."
    : "Para instalar Lojanova: toca el menú ⋮ de Chrome y elige ‘Instalar app’ o ‘Añadir a pantalla de inicio’."
  );
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallControls();
});

window.addEventListener("appinstalled", () => {
  trackAppInstallEvent("instalada", sessionStorage.getItem("lojanova_last_app_install_control") || "Instalación confirmada");
  deferredInstallPrompt = null;
  hideInstallControlsAfterInstall();
});

async function installApp(trigger) {
  const control = trigger?.classList.contains("mobile-app-download") ? "Botón flotante inferior izquierdo" : trigger?.classList.contains("install-app-menu-btn") ? "Menú móvil" : "Navbar";
  sessionStorage.setItem("lojanova_last_app_install_control", control);
  trackAppInstallEvent("clic", control);
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice?.outcome === "accepted") hideInstallControlsAfterInstall();
    return;
  }
  showManualInstallHelp();
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-install-app], .mobile-app-download");
  if (trigger) installApp(trigger);
});

["DOMContentLoaded", "load", "pageshow", "visibilitychange"].forEach(eventName => {
  window.addEventListener(eventName, showInstallControls);
});
setInterval(showInstallControls, 1500);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingApp) return;
    refreshingApp = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js?v=20260803-app-analytics");
      const activateWaitingWorker = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      if (registration.waiting) activateWaitingWorker();
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) activateWaitingWorker();
        });
      });
      await registration.update();
      setInterval(() => registration.update(), 15 * 60 * 1000);
    } catch (error) {
      console.warn("No se pudo registrar la app instalable:", error);
    }
  });
}

showInstallControls();


