// =========================================================
// LOJANOVA — Edge Function: rechazar-productor
// POST { emprendedor_id: string, motivo?: string }
// Solo la puede ejecutar un usuario que esté en la tabla "admins".
// No borra la cuenta, solo la marca como rechazada (no se publica).
// =========================================================
import { corsPreflight, jsonResponse, requireAdmin, serviceClient } from "../_shared/admin-guard.ts";

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const admin = await requireAdmin(req);
  if (!admin) return jsonResponse({ error: "No autorizado. Debes iniciar sesión como administrador." }, 401);

  let body: { emprendedor_id?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la solicitud inválido." }, 400);
  }

  if (!body.emprendedor_id) {
    return jsonResponse({ error: "Falta emprendedor_id." }, 400);
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("emprendedores")
    .update({ estado: "rechazado", activo: false })
    .eq("id", body.emprendedor_id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 400);

  return jsonResponse({ ok: true, emprendedor: data });
});
