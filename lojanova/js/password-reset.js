const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const recoverForm = document.getElementById("recoverForm");
const updatePasswordForm = document.getElementById("updatePasswordForm");
const submitBtn = document.getElementById("submitBtn");

const SITE_URL = "https://prefecturalojanova.com";

function showAuthMessage(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function hideAuthMessages() {
  if (errorMsg) errorMsg.style.display = "none";
  if (successMsg) successMsg.style.display = "none";
}

function getAuthErrorMessage(error, fallback) {
  const message = error?.message || error?.error_description || error?.error || fallback;
  const normalized = String(message).toLowerCase();

  if (normalized.includes("email logins are disabled")) {
    return "El proveedor Email está desactivado en Supabase.";
  }

  if (normalized.includes("rate limit")) {
    return "Supabase recibió muchos intentos. Espera unos minutos e inténtalo otra vez.";
  }

  return message;
}

if (recoverForm) {
  recoverForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAuthMessages();
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const email = document.getElementById("email").value.trim();
    const redirectTo = `${SITE_URL}/actualizar-password.html`;
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      showAuthMessage(errorMsg, getAuthErrorMessage(error, "No se pudo enviar el enlace."));
    } else {
      showAuthMessage(successMsg, "Listo. Revisa tu correo y abre el enlace para crear una nueva contraseña.");
      recoverForm.reset();
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar enlace";
  });
}

if (updatePasswordForm) {
  db.auth.getSession().then(({ data }) => {
    if (!data.session) {
      showAuthMessage(errorMsg, "Abre esta página desde el enlace de recuperación enviado a tu correo.");
    }
  });

  updatePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAuthMessages();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showAuthMessage(errorMsg, "Las contraseñas no coinciden.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Actualizando...";

    const { error } = await db.auth.updateUser({ password });

    if (error) {
      showAuthMessage(errorMsg, getAuthErrorMessage(error, "No se pudo actualizar la contraseña."));
      submitBtn.disabled = false;
      submitBtn.textContent = "Actualizar contraseña";
      return;
    }

    await db.auth.signOut();
    showAuthMessage(successMsg, "Contraseña actualizada. Ya puedes iniciar sesión.");
    updatePasswordForm.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = "Actualizar contraseña";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1800);
  });
}
