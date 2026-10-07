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

/**
 * Manda un mensaje de PLANTILLA (template) por WhatsApp. A diferencia de
 * sendWhatsappMessage (texto libre), esto es lo único que WhatsApp permite
 * mandarle a un número que todavía no te escribió a vos primero, o que te
 * escribió hace más de 24hs — por eso hace falta una plantilla ya aprobada
 * por Meta en el WhatsApp Manager (no se puede mandar texto cualquiera).
 * templateName/languageCode tienen que coincidir exactamente con cómo
 * quedó aprobada la plantilla.
 */
export async function sendWhatsappTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  // Las plantillas que se crean hoy en el WhatsApp Manager usan "parámetros
  // con nombre" (ej: {{customer_name}}) en vez de los viejos {{1}}, {{2}}.
  // Meta rechaza el envío si no le mandamos ese nombre exacto junto con el
  // valor, con el error "Parameter name is missing or empty".
  bodyParams: { name: string; value: string }[] = []
) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      "Falta configurar WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID para poder enviar mensajes de WhatsApp."
    );
  }

  const components =
    bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: bodyParams.map((p) => ({
              type: "text",
              parameter_name: p.name,
              text: p.value,
            })),
          },
        ]
      : [];

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
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Error al enviar plantilla de WhatsApp: ${JSON.stringify(data)}`
    );
  }

  const waMessageId: string | undefined = data?.messages?.[0]?.id;
  return { waMessageId, raw: data };
}

