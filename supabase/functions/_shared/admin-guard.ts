// =========================================================
// LOJANOVA — supabase/functions/_shared/admin-guard.ts
// Utilidad compartida por las Edge Functions de administración.
// Verifica que quien llama esté autenticado Y sea admin.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function corsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  return null;
}

// Cliente con permisos totales (solo se usa DENTRO de la función, en el servidor)
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Verifica el JWT que envía el navegador y confirma que el usuario
// esté en la tabla "admins". Devuelve el user.id del admin o null.
export async function requireAdmin(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;

  const { data: admin } = await userClient.from("admins").select("id").eq("id", user.id).maybeSingle();
  if (!admin) return null;

  return { id: user.id };
}
