let deferredInstallPrompt = null;
let refreshingApp = false;
const installButtons = [...document.querySelectorAll("[data-install-app]")];

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 900px), (hover: none), (pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function showInstallButton() {
  if (!installButtons.length || isStandaloneMode() || !isMobileDevice()) return;
  installButtons.forEach(button => {
    button.hidden = false;
    button.classList.add("is-visible");
  });
}

function hideInstallButton() {
  installButtons.forEach(button => {
    button.hidden = true;
    button.classList.remove("is-visible");
  });
}

function showManualInstallHelp() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const message = isIOS
    ? "Para instalar Lojanova en iPhone: abre esta página en Safari, toca Compartir y elige ‘Agregar a pantalla de inicio’."
    : "Para instalar Lojanova: toca el menú de Chrome y elige ‘Instalar app’ o ‘Añadir a pantalla de inicio’.";
  alert(message);
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  hideInstallButton();
});

async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallButton();
    return;
  }

  showManualInstallHelp();
}

installButtons.forEach(button => button.addEventListener("click", handleInstallClick));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingApp) return;
    refreshingApp = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js?v=20260803-install-visible");
      const activateWaitingWorker = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });

      if (registration.waiting) activateWaitingWorker();

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            activateWaitingWorker();
          }
        });
      });

      await registration.update();
      setInterval(() => registration.update(), 15 * 60 * 1000);
    } catch (error) {
      console.warn("No se pudo registrar la app instalable:", error);
    }
  });
}

showInstallButton();
