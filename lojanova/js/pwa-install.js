let deferredInstallPrompt = null;
let refreshingApp = false;

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 900px), (hover: none), (pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getInstallButtons() {
  return [...document.querySelectorAll("[data-install-app]")];
}

function ensureFloatingInstallButton() {
  let button = document.getElementById("installAppFloatingBtn");
  if (button) return button;

  button = document.createElement("button");
  button.id = "installAppFloatingBtn";
  button.type = "button";
  button.className = "install-app-floating-btn notranslate";
  button.setAttribute("data-install-app", "");
  button.setAttribute("aria-label", "Descargar Lojanova como app");
  button.innerHTML = '<span aria-hidden="true">↓</span><strong>Descargar app</strong>';
  document.body.appendChild(button);
  return button;
}

function showInstallButton() {
  if (!isMobileDevice() || isStandaloneMode()) return;
  ensureFloatingInstallButton();
  getInstallButtons().forEach(button => {
    button.hidden = false;
    button.classList.add("is-visible");
  });
}

function hideInstallButton() {
  getInstallButtons().forEach(button => {
    button.hidden = true;
    button.classList.remove("is-visible");
  });
}

function showManualInstallHelp() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const message = isIOS
    ? "Para instalar Lojanova en iPhone: abre esta página en Safari, toca Compartir y elige ‘Agregar a pantalla de inicio’."
    : "Si no aparece la ventana automática, instala Lojanova desde Chrome: toca ⋮ arriba a la derecha y elige ‘Instalar app’ o ‘Añadir a pantalla de inicio’.";
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

async function handleInstallClick(event) {
  const target = event.target.closest("[data-install-app]");
  if (!target) return;

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice?.outcome === "accepted") hideInstallButton();
    return;
  }

  showManualInstallHelp();
}

document.addEventListener("click", handleInstallClick);

document.addEventListener("DOMContentLoaded", () => {
  if (isMobileDevice() && !isStandaloneMode()) showInstallButton();
});

window.addEventListener("load", () => {
  if (isMobileDevice() && !isStandaloneMode()) showInstallButton();
});

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
