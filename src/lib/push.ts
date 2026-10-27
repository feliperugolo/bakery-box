import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Notificaciones push para avisarle al equipo que una conversación de
 * WhatsApp necesita respuesta humana. Esto es lo que hace que aparezca el
 * numerito rojo en el ícono del panel agregado a la pantalla de inicio,
 * incluso con la app cerrada.
 *
 * Esta función NUNCA debe tirar un error hacia arriba: si falla el envío de
 * push (claves mal configuradas, suscripción vencida, etc.) no puede romper
 * el flujo del bot de WhatsApp ni el webhook que la llama.
 */

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@bakerybox.com.ar";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * Recalcula cuántas conversaciones necesitan respuesta del equipo y le
 * manda un push a cada dispositivo suscripto con ese número (para el
 * numerito rojo) y una notificación visible.
 */
export async function notifyTeamPush(supabase: AnySupabaseClient): Promise<void> {
  try {
    if (!ensureVapidConfigured()) {
      // Las claves VAPID no están configuradas (ej: en desarrollo local) —
      // seguimos de largo sin mandar push, sin romper nada.
      return;
    }

    const [{ count: unreadCount }, { data: subscriptions, error: subsError }] = await Promise.all([
      supabase
        .from("whatsapp_conversations")
        .select("id", { count: "exact", head: true })
        .eq("needs_attention", true),
      supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth"),
    ]);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: "Bakery Box · WhatsApp",
      body:
        unreadCount && unreadCount > 0
          ? `Hay ${unreadCount} conversación${unreadCount === 1 ? "" : "es"} esperando respuesta del equipo.`
          : "Hay una conversación que necesita respuesta.",
      unreadCount: unreadCount || 0,
      url: "/admin/whatsapp",
    });

    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number } | null)?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // La suscripción ya no existe del lado del navegador/iOS —
            // la limpiamos para no seguir intentando mandarle en vano.
            expiredIds.push(sub.id);
          } else {
            console.error("Error al mandar push a una suscripción:", err);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }
  } catch (err) {
    console.error("Error inesperado al mandar notificaciones push:", err);
  }
}
