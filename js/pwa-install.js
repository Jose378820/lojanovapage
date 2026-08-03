let deferredInstallPrompt = null;
const installButton = document.getElementById("installAppBtn");

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function showInstallButton() {
  if (!installButton || isStandaloneMode()) return;
  installButton.hidden = false;
}

function showManualInstallHelp() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const message = isIOS
    ? "Para instalar Lojanova en iPhone: abre esta página en Safari, toca Compartir y elige ‘Agregar a pantalla de inicio’."
    : "Para instalar Lojanova: abre el menú del navegador y elige ‘Instalar app’ o ‘Añadir a pantalla de inicio’.";
  alert(message);
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

installButton?.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
    return;
  }

  showManualInstallHelp();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js?v=20260802-pwa");
      registration.update();
      setInterval(() => registration.update(), 60 * 60 * 1000);
    } catch (error) {
      console.warn("No se pudo registrar la app instalable:", error);
    }
  });
}

if (isMobileDevice()) showInstallButton();
