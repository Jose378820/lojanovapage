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
  deferredInstallPrompt = null;
  hideInstallControlsAfterInstall();
});

async function installApp() {
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
  if (event.target.closest("[data-install-app], .mobile-app-download")) installApp();
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
      const registration = await navigator.serviceWorker.register("/sw.js?v=20260803-force-floating");
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
