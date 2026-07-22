// =========================================================
// LOJANOVA — Edge Function: eliminar-productor
// POST { emprendedor_id: string }
// Solo la puede ejecutar un usuario que esté en la tabla "admins".
// Borra sus productos, su fila de emprendedor y su cuenta de acceso
// (auth.users) usando la service_role key — esto NUNCA se puede hacer
// desde el navegador con la anon key, por eso vive en una Edge Function.
// =========================================================
import { corsPreflight, jsonResponse, requireAdmin, serviceClient } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const admin = await requireAdmin(req);
  if (!admin) return jsonResponse({ error: "No autorizado. Debes iniciar sesión como administrador." }, 401);

  let body: { emprendedor_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la solicitud inválido." }, 400);
  }

  if (!body.emprendedor_id) {
    return jsonResponse({ error: "Falta emprendedor_id." }, 400);
  }

  const db = serviceClient();

  const { data: emprendedor, error: findError } = await db
    .from("emprendedores")
    .select("id, auth_user_id, nombre")
    .eq("id", body.emprendedor_id)
    .maybeSingle();

  if (findError) return jsonResponse({ error: findError.message }, 400);
  if (!emprendedor) return jsonResponse({ error: "Productor no encontrado." }, 404);

  const { error: prodError } = await db.from("productos").delete().eq("emprendedor_id", emprendedor.id);
  if (prodError) return jsonResponse({ error: prodError.message }, 400);

  const { error: empError } = await db.from("emprendedores").delete().eq("id", emprendedor.id);
  if (empError) return jsonResponse({ error: empError.message }, 400);

  if (emprendedor.auth_user_id) {
    const { error: authError } = await db.auth.admin.deleteUser(emprendedor.auth_user_id);
    if (authError) {
      return jsonResponse({ ok: true, warning: "Perfil eliminado, pero no se pudo borrar la cuenta de acceso: " + authError.message });
    }
  }

  return jsonResponse({ ok: true });
});
