import Anthropic from "@anthropic-ai/sdk";

const GRAPH_API_VERSION = "v23.0";

/**
 * Descarga un archivo de medios de WhatsApp (foto, audio, etc.) a partir de
 * su media id. WhatsApp no da una URL directa: primero hay que pedirle a
 * Meta la URL real (que vence rápido) y después bajar el archivo desde ahí,
 * mandando el token las dos veces.
 */
export async function downloadWhatsappMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    throw new Error("Falta WHATSAPP_TOKEN para descargar medios de WhatsApp.");
  }

  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(`No se pudo obtener la URL del medio de WhatsApp (status ${metaRes.status}).`);
  }
  const meta = await metaRes.json();
  const mediaUrl: string | undefined = meta?.url;
  const mimeType: string = meta?.mime_type || "application/octet-stream";
  if (!mediaUrl) {
    throw new Error("WhatsApp no devolvió una URL para este medio.");
  }

  const fileRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    throw new Error(`No se pudo descargar el archivo de WhatsApp (status ${fileRes.status}).`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

/**
 * Le muestra la imagen o el PDF a la IA solo para clasificarlo: ¿es un
 * comprobante de pago/transferencia o no? Esto es independiente del bot de
 * charla (agent.ts) — es una consulta chica y rápida, separada, para decidir
 * cómo reaccionar antes de meter el archivo en la conversación principal.
 * Claude puede leer tanto fotos como PDFs directamente, así que el único
 * cambio entre uno y otro es el tipo de bloque que se manda.
 */
export async function classifyReceiptMedia(
  base64Data: string,
  mimeType: string
): Promise<{ isReceipt: boolean; amount: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { isReceipt: false, amount: null };

  const anthropic = new Anthropic({ apiKey });
  const isPdf = mimeType === "application/pdf";

  try {
    const response = await anthropic.messages.create({
      model: process.env.WHATSAPP_BOT_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: base64Data,
                  },
                }
              : {
                  type: "image",
                  source: {
                    type: "base64",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    media_type: mimeType as any,
                    data: base64Data,
                  },
                },
            {
              type: "text",
              text:
                'Mirá este archivo. ¿Es un comprobante de pago, transferencia bancaria o pago digital (ej: captura o PDF de Mercado Pago, home banking, transferencia, recibo de pago)? Respondé SOLO con un JSON de una línea, sin texto alrededor ni markdown, con esta forma exacta: {"is_receipt": true o false, "amount": "monto si se lee claro en el comprobante, sino null"}',
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { isReceipt: false, amount: null };

    const parsed = JSON.parse(match[0]);
    const rawAmount = typeof parsed.amount === "string" ? parsed.amount.replace(/[\r\n]/g, "").trim().slice(0, 40) : null;

    return {
      isReceipt: Boolean(parsed.is_receipt),
      amount: rawAmount && rawAmount.toLowerCase() !== "null" ? rawAmount : null,
    };
  } catch (err) {
    console.error("Error clasificando archivo de WhatsApp con IA:", err);
    return { isReceipt: false, amount: null };
  }
}
