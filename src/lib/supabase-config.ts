// Chequeo compartido (server y client) de si Supabase ya está conectado.
// Antes de configurarlo, el sitio público sigue funcionando con datos de
// muestra (ver src/lib/seed-data.ts), pero el panel de administrador
// necesita Supabase sí o sí para login y para guardar cambios.
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
