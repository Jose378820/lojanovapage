let CATEGORIAS = [];
let CANTONES = [];
let EMPRENDEDOR = null;
let PRODUCTOS = [];

const profileForm = document.getElementById("profileForm");
const productForm = document.getElementById("productForm");
const statusBox = document.getElementById("statusBox");

(async function guard() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.href = "login.html";
    return;
  }

  const { data: admin } = await db.from("admins").select("id").eq("id", session.user.id).maybeSingle();
  if (admin) {
    await db.auth.signOut();
    location.href = "admin/index.html";
    return;
  }

  const { data: emprendedor, error } = await db
    .from("emprendedores")
    .select("*, cantones(nombre)")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (error || !emprendedor) {
    await db.auth.signOut();
    location.href = "login.html";
    return;
  }

  EMPRENDEDOR = emprendedor;
  iniciarPanel();
})();

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function slugify(str) {
  return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function showStatus(message, type = "success") {
  statusBox.textContent = message;
  statusBox.className = type === "error" ? "error-msg panel-message" : "success-msg panel-message";
  statusBox.style.display = "block";
  window.setTimeout(() => { statusBox.style.display = "none"; }, 4200);
}

async function iniciarPanel() {
  lucide.createIcons();
  document.getElementById("producerName").textContent = EMPRENDEDOR.nombre;
  document.getElementById("producerBusiness").textContent = EMPRENDEDOR.emprendimiento;

  await cargarListas();
  pintarPerfil();
  await cargarProductos();
}

async function cargarListas() {
  const [{ data: categorias }, { data: cantones }] = await Promise.all([
    db.from("categorias").select("*").order("orden"),
    db.from("cantones").select("*").order("orden"),
  ]);

  CATEGORIAS = categorias || [];
  CANTONES = cantones || [];

  const categoriaOptions = `<option value="">Selecciona...</option>` + CATEGORIAS.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
  const cantonOptions = `<option value="">Selecciona...</option>` + CANTONES.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");

  document.getElementById("productoCategoria").innerHTML = categoriaOptions;
  document.getElementById("productoCanton").innerHTML = cantonOptions;
  document.getElementById("perfilCanton").innerHTML = cantonOptions;
}

function pintarPerfil() {
  document.getElementById("perfilNombre").value = EMPRENDEDOR.nombre || "";
  document.getElementById("perfilEmprendimiento").value = EMPRENDEDOR.emprendimiento || "";
  document.getElementById("perfilCanton").value = EMPRENDEDOR.canton_id || "";
  document.getElementById("perfilAnios").value = EMPRENDEDOR.anios_experiencia || "";
  document.getElementById("perfilHistoria").value = EMPRENDEDOR.historia || "";
  document.getElementById("perfilTelefono").value = EMPRENDEDOR.telefono || "";
  document.getElementById("perfilWhatsapp").value = EMPRENDEDOR.whatsapp || "";
  document.getElementById("perfilCorreo").value = EMPRENDEDOR.correo || "";
  document.getElementById("perfilUbicacion").value = EMPRENDEDOR.ubicacion || "";
  document.getElementById("perfilFacebook").value = EMPRENDEDOR.facebook || "";
  document.getElementById("perfilInstagram").value = EMPRENDEDOR.instagram || "";
  document.getElementById("perfilFoto").value = EMPRENDEDOR.foto_url || "";
}

async function cargarProductos() {
  const { data, error } = await db
    .from("productos")
    .select("*, categorias(nombre), cantones(nombre)")
    .eq("emprendedor_id", EMPRENDEDOR.id)
    .order("created_at", { ascending: false });

  PRODUCTOS = data || [];
  document.getElementById("kpiProductos").textContent = PRODUCTOS.length;
  document.getElementById("kpiPublicados").textContent = PRODUCTOS.filter(p => p.activo).length;

  const tbody = document.getElementById("tablaProductos");
  if (error || PRODUCTOS.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Aun no tienes productos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = PRODUCTOS.map(producto => `
    <tr>
      <td><img class="thumb-sm" src="${producto.imagen_principal_url || "https://placehold.co/80x80/EFE9DA/1E5A3A?text=%20"}" alt=""></td>
      <td>${escapeHtml(producto.nombre)}</td>
      <td>${escapeHtml(producto.categorias?.nombre || "-")}</td>
      <td><span class="status-pill ${producto.activo ? "on" : "off"}">${producto.activo ? "Publicado" : "Oculto"}</span></td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" onclick="editarProducto('${producto.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${producto.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function resetProductForm() {
  productForm.reset();
  document.getElementById("productoId").value = "";
  document.getElementById("productoActivo").checked = true;
  document.getElementById("productoArtesanal").checked = false;
  document.getElementById("productoExportacion").checked = false;
  document.getElementById("productFormTitle").textContent = "Nuevo producto";
}

window.editarProducto = function(id) {
  const producto = PRODUCTOS.find(item => item.id === id);
  if (!producto) return;

  document.getElementById("productFormTitle").textContent = "Editar producto";
  document.getElementById("productoId").value = producto.id;
  document.getElementById("productoNombre").value = producto.nombre || "";
  document.getElementById("productoCategoria").value = producto.categoria_id || "";
  document.getElementById("productoCanton").value = producto.canton_id || "";
  document.getElementById("productoDescCorta").value = producto.descripcion_corta || "";
  document.getElementById("productoDescLarga").value = producto.descripcion_larga || "";
  document.getElementById("productoProceso").value = producto.proceso_elaboracion || "";
  document.getElementById("productoIngredientes").value = producto.ingredientes || "";
  document.getElementById("productoPresentacion").value = producto.presentacion || "";
  document.getElementById("productoDisponibilidad").value = producto.disponibilidad || "";
  document.getElementById("productoMercados").value = producto.mercados || "";
  document.getElementById("productoEtiquetas").value = (producto.etiquetas || []).join(", ");
  document.getElementById("productoImagen").value = producto.imagen_principal_url || "";
  document.getElementById("productoActivo").checked = !!producto.activo;
  document.getElementById("productoArtesanal").checked = !!producto.es_artesanal;
  document.getElementById("productoExportacion").checked = !!producto.es_exportacion;
  document.getElementById("productFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
};

window.eliminarProducto = async function(id) {
  if (!confirm("Eliminar este producto?")) return;
  const { error } = await db.from("productos").delete().eq("id", id);
  if (error) {
    showStatus("No se pudo eliminar: " + error.message, "error");
    return;
  }
  showStatus("Producto eliminado.");
  resetProductForm();
  cargarProductos();
};

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    nombre: document.getElementById("perfilNombre").value.trim(),
    emprendimiento: document.getElementById("perfilEmprendimiento").value.trim(),
    canton_id: document.getElementById("perfilCanton").value || null,
    anios_experiencia: document.getElementById("perfilAnios").value ? Number(document.getElementById("perfilAnios").value) : null,
    historia: document.getElementById("perfilHistoria").value.trim(),
    telefono: document.getElementById("perfilTelefono").value.trim(),
    whatsapp: document.getElementById("perfilWhatsapp").value.trim(),
    correo: document.getElementById("perfilCorreo").value.trim(),
    ubicacion: document.getElementById("perfilUbicacion").value.trim(),
    facebook: document.getElementById("perfilFacebook").value.trim(),
    instagram: document.getElementById("perfilInstagram").value.trim(),
    foto_url: document.getElementById("perfilFoto").value.trim(),
  };

  const { data, error } = await db
    .from("emprendedores")
    .update(payload)
    .eq("id", EMPRENDEDOR.id)
    .select("*, cantones(nombre)")
    .single();

  if (error) {
    showStatus("No se pudo guardar el perfil: " + error.message, "error");
    return;
  }

  EMPRENDEDOR = data;
  document.getElementById("producerName").textContent = EMPRENDEDOR.nombre;
  document.getElementById("producerBusiness").textContent = EMPRENDEDOR.emprendimiento;
  showStatus("Perfil actualizado.");
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("productoId").value;
  const nombre = document.getElementById("productoNombre").value.trim();
  const payload = {
    nombre,
    categoria_id: document.getElementById("productoCategoria").value || null,
    canton_id: document.getElementById("productoCanton").value || null,
    emprendedor_id: EMPRENDEDOR.id,
    descripcion_corta: document.getElementById("productoDescCorta").value.trim(),
    descripcion_larga: document.getElementById("productoDescLarga").value.trim(),
    proceso_elaboracion: document.getElementById("productoProceso").value.trim(),
    ingredientes: document.getElementById("productoIngredientes").value.trim(),
    presentacion: document.getElementById("productoPresentacion").value.trim(),
    disponibilidad: document.getElementById("productoDisponibilidad").value.trim(),
    mercados: document.getElementById("productoMercados").value.trim(),
    etiquetas: document.getElementById("productoEtiquetas").value.split(",").map(item => item.trim()).filter(Boolean),
    imagen_principal_url: document.getElementById("productoImagen").value.trim(),
    es_artesanal: document.getElementById("productoArtesanal").checked,
    es_exportacion: document.getElementById("productoExportacion").checked,
    activo: document.getElementById("productoActivo").checked,
  };

  if (!id) payload.slug = slugify(nombre) + "-" + Date.now().toString(36);

  const query = id
    ? db.from("productos").update(payload).eq("id", id)
    : db.from("productos").insert(payload);

  const { error } = await query;
  if (error) {
    showStatus("No se pudo guardar el producto: " + error.message, "error");
    return;
  }

  showStatus("Producto guardado.");
  resetProductForm();
  cargarProductos();
});

document.getElementById("btnNuevoProducto").addEventListener("click", () => {
  resetProductForm();
  document.getElementById("productFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("btnCancelarProducto").addEventListener("click", resetProductForm);

document.getElementById("btnLogout").addEventListener("click", async () => {
  await db.auth.signOut();
  location.href = "login.html";
});
