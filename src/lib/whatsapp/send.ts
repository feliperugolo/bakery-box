const GRAPH_API_VERSION = "v23.0";

/**
 * Manda un mensaje de texto por WhatsApp usando la Cloud API de Meta.
 * Requiere WHATSAPP_TOKEN (token permanente) y WHATSAPP_PHONE_NUMBER_ID
 * (el id interno del número de Bakery Box en Meta, no el número en sí).
 */
export async function sendWhatsappMessage(
  to: string,
  body: string,
  options: { replyToWaMessageId?: string } = {}
) {
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
        ...(options.replyToWaMessageId
          ? { context: { message_id: options.replyToWaMessageId } }
          : {}),
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


/**
 * Sube un archivo (imagen, PDF, audio, etc.) a los servidores de WhatsApp
 * para poder mandarlo después. Devuelve un media id que solo sirve para UN
 * envío — a diferencia de los archivos que llegan de un cliente, acá no
 * hace falta pedir la URL real, Meta la maneja del todo lado servidor.
 */
export async function uploadWhatsappMedia(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      "Falta configurar WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID para poder enviar archivos de WhatsApp."
    );
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Error al subir archivo a WhatsApp: ${JSON.stringify(data)}`);
  }

  const mediaId: string | undefined = data?.id;
  if (!mediaId) {
    throw new Error("WhatsApp no devolvió un id para el archivo subido.");
  }
  return mediaId;
}

export type WhatsappMediaKind = "image" | "video" | "audio" | "document";

/**
 * Manda un mensaje con un archivo ya subido (ver uploadWhatsappMedia). El
 * "type" tiene que coincidir con el tipo real del archivo — WhatsApp lo usa
 * para decidir cómo mostrarlo del otro lado (imagen inline, reproductor de
 * audio, link de descarga para documentos, etc).
 */
export async function sendWhatsappMedia(
  to: string,
  mediaId: string,
  kind: WhatsappMediaKind,
  options: { caption?: string; filename?: string; replyToWaMessageId?: string } = {}
) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      "Falta configurar WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID para poder enviar archivos de WhatsApp."
    );
  }

  const mediaObject: Record<string, string> = { id: mediaId };
  if (options.caption) mediaObject.caption = options.caption;
  // Los audios no admiten caption ni filename en la Cloud API — WhatsApp
  // los rechaza si se los mandamos, por eso solo se agregan para el resto.
  if (kind === "document" && options.filename) mediaObject.filename = options.filename;

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
        type: kind,
        [kind]: mediaObject,
        ...(options.replyToWaMessageId
          ? { context: { message_id: options.replyToWaMessageId } }
          : {}),
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Error al enviar archivo de WhatsApp: ${JSON.stringify(data)}`);
  }

  const waMessageId: string | undefined = data?.messages?.[0]?.id;
  return { waMessageId, raw: data };
}
