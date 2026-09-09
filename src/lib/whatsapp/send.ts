const GRAPH_API_VERSION = "v23.0";

/**
 * Manda un mensaje de texto por WhatsApp usando la Cloud API de Meta.
 * Requiere WHATSAPP_TOKEN (token permanente) y WHATSAPP_PHONE_NUMBER_ID
 * (el id interno del número de Bakery Box en Meta, no el número en sí).
 */
export async function sendWhatsappMessage(to: string, body: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      "Falta configurar WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID para poder enviar mensajes de WhatsApp."
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body, preview_url: false },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Error al enviar mensaje de WhatsApp: ${JSON.stringify(data)}`
    );
  }

  const waMessageId: string | undefined = data?.messages?.[0]?.id;
  return { waMessageId, raw: data };
}

export const isWhatsappApiConfigured = Boolean(
  process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
);
