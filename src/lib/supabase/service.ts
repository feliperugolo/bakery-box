import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la service role key: ignora Row Level Security.
 *
 * Se usa SOLO en rutas de servidor sin sesión de usuario (como el webhook de
 * WhatsApp, que lo llama Meta directamente, sin que el admin haya iniciado
 * sesión). Nunca se debe importar desde un componente cliente ni exponer la
 * service role key con el prefijo NEXT_PUBLIC_.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL) para usar el cliente de servicio."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const isServiceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
