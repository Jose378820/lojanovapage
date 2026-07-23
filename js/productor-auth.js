const form = document.getElementById("authForm");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const submitBtn = document.getElementById("submitBtn");

function showMessage(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function hideMessages() {
  errorMsg.style.display = "none";
  if (successMsg) successMsg.style.display = "none";
}

async function redirectIfProducer() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;

  const { data: admin } = await db.from("admins").select("id").eq("id", session.user.id).maybeSingle();
  if (admin) return;

  const { data: emprendedor } = await db
    .from("emprendedores")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (emprendedor) location.href = "mi-panel.html";
}

redirectIfProducer();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessages();
  submitBtn.disabled = true;

  const mode = form.dataset.mode;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (mode === "registro") {
    submitBtn.textContent = "Creando cuenta...";

    const nombre = document.getElementById("nombre").value.trim();
    const emprendimiento = document.getElementById("emprendimiento").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showMessage(errorMsg, "Las contrasenas no coinciden.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Crear cuenta";
      return;
    }

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login.html`,
        data: {
          rol: "productor",
          nombre,
          emprendimiento,
        },
      },
    });

    if (error) {
      showMessage(errorMsg, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Crear cuenta";
      return;
    }

    if (data.session) {
      location.href = "mi-panel.html";
      return;
    }

    showMessage(successMsg, "Cuenta creada. Revisa tu correo para confirmar el registro y luego inicia sesion.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Crear cuenta";
    return;
  }

  submitBtn.textContent = "Ingresando...";

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage(errorMsg, "Correo o contrasena incorrectos.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Ingresar";
    return;
  }

  const { data: admin } = await db.from("admins").select("id").eq("id", data.user.id).maybeSingle();
  if (admin) {
    await db.auth.signOut();
    showMessage(errorMsg, "Esta cuenta es administradora. Ingresa desde admin/index.html.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Ingresar";
    return;
  }

  const { data: emprendedor } = await db
    .from("emprendedores")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!emprendedor) {
    await db.auth.signOut();
    showMessage(errorMsg, "No existe un perfil de productor asociado a esta cuenta.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Ingresar";
    return;
  }

  location.href = "mi-panel.html";
});
