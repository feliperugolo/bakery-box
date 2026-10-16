import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getOrCreateConversation,
  insertMessage,
  touchConversation,
  getRecentMessages,
  isRepeatingLoop,
  acquireBotLockWithWait,
  releaseBotLock,
} from "@/lib/whatsapp/store";
import { runBotTurn } from "@/lib/whatsapp/agent";
import { sendWhatsappMessage } from "@/lib/whatsapp/send";
import { downloadWhatsappMedia, classifyReceiptMedia } from "@/lib/whatsapp/media";

/**
 * Mensajes de WhatsApp que no son texto (audio, imagen, video, documento,
 * sticker, ubicación, etc). El bot no puede "escuchar" ni "ver" nada de
 * esto todavía, así que en vez de quedarse mudo le avisamos al cliente y
 * le pedimos que lo escriba.
 */
const NON_TEXT_LABELS: Record<string, string> = {
  audio: "un audio",
  voice: "un audio",
  image: "una imagen",
  sticker: "un sticker",
  video: "un video",
  document: "un archivo",
  location: "una ubicación",
  contacts: "un contacto",
};

function nonTextReply(isNewCustomer: boolean): string {
  if (isNewCustomer) {
    return "¡Hola! Gracias por comunicarte con Bakery Box 🧁 Soy el asistente virtual de la tienda. Por ahora este WhatsApp no puede escuchar audios ni ver imágenes — ¿me contás por mensaje de texto en qué te puedo ayudar?";
  }
  return "Este WhatsApp todavía no puede escuchar audios ni ver imágenes. ¿Me lo escribís en un mensaje de texto? Así seguimos sin problema.";
}

function nonTextPreview(type: string): string {
  const label = NON_TEXT_LABELS[type] || "mensaje";
  return `📎 Envió ${label}`;
}

/**
 * Reacciones (ej: tocar y mantener un mensaje para poner un 👍 o ❤️). WhatsApp
 * manda esto como un mensaje de tipo "reaction", no como texto. No es algo
 * que el bot tenga que responder — solo lo dejamos registrado en la
 * conversación para que se vea en el panel, y no le contestamos nada.
 */
function reactionPreview(message: { reaction?: { emoji?: string } }): string {
  const emoji = message.reaction?.emoji;
  return emoji ? `Reaccionó con ${emoji}` : "Reaccionó a un mensaje";
}

/**
 * Verificación del webhook: Meta llama a esto una sola vez cuando configurás
 * la URL en el panel de desarrolladores, para confirmar que el endpoint es
 * tuyo. Tiene que devolver el "challenge" tal cual si el verify_token coincide.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge || "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Mensajes entrantes de WhatsApp (Meta manda un POST por cada evento).
 * Guardamos el mensaje, y si el bot no está pausado para esa conversación,
 * le pedimos una respuesta a la IA y la mandamos de vuelta.
 */
export async function POST(request: NextRequest) {
  // Siempre respondemos 200 rápido: si Meta no recibe un 200, reintenta el
  // mismo webhook varias veces y podríamos procesar el mensaje duplicado.
  try {
    const body = await request.json();
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    // Puede llegar un evento sin mensaje (ej: confirmación de lectura) — no hay nada que hacer.
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const fromNumber: string = message.from;
    const waMessageId: string = message.id;
    const contactName: string | undefined =
      change?.contacts?.[0]?.profile?.name;
    const isText = message.type === "text";
    const isReaction = message.type === "reaction";
    const isImage = message.type === "image";
    // Un comprobante también puede llegar como PDF en vez de foto (ej:
    // exportado del home banking). Solo tratamos como posible comprobante
    // los documentos que son PDF — un .docx, .xlsx, etc. sigue cayendo en
    // el aviso genérico de "no puedo leer este tipo de archivo".
    const isPdfDocument = message.type === "document" && message.document?.mime_type === "application/pdf";
    const mediaId: string | undefined = isImage ? message.image?.id : isPdfDocument ? message.document?.id : undefined;
    const text: string = isText ? message.text?.body || "" : "";

    const supabase = createServiceClient();
    const { conversation, isNew } = await getOrCreateConversation(supabase, fromNumber, contactName);

    // Si manda una foto o un PDF, lo bajamos de WhatsApp y lo guardamos en
    // Supabase Storage (así queda visible en el panel), y le pedimos a la
    // IA que lo mire solo para decidir si es un comprobante de
    // pago/transferencia — esto es aparte del bot de charla normal. Si algo
    // de esto falla (Meta no responde, etc.) seguimos igual: el archivo
    // simplemente no se trata como comprobante y cae en el aviso genérico.
    let mediaPath: string | null = null;
    let mediaType: string | null = null;
    let isReceiptImage = false;
    let receiptAmount: string | null = null;

    if (mediaId) {
      try {
        const media = await downloadWhatsappMedia(mediaId);
        mediaType = media.mimeType;
        const ext = (mediaType.split("/")[1] || "jpg").split("+")[0];
        const candidatePath = `${conversation.id}/${waMessageId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("whatsapp-media")
          .upload(candidatePath, media.buffer, { contentType: mediaType, upsert: true });

        if (uploadError) {
          console.error("Error subiendo archivo de WhatsApp a Storage:", uploadError);
        } else {
          mediaPath = candidatePath;
          const classification = await classifyReceiptMedia(media.buffer.toString("base64"), mediaType);
          isReceiptImage = classification.isReceipt;
          receiptAmount = classification.amount;
        }
      } catch (err) {
        console.error("Error procesando archivo de WhatsApp:", err);
      }
    }

    const inboundPreview = isText
      ? text
      : isReaction
        ? reactionPreview(message)
        : isReceiptImage
          ? `🧾 Envió un comprobante de pago${receiptAmount ? ` (${receiptAmount})` : ""}`
          : nonTextPreview(message.type);

    const { duplicate } = await insertMessage(supabase, {
      conversationId: conversation.id,
      direction: "inbound",
      sender: "customer",
      body: inboundPreview,
      waMessageId,
      mediaPath,
      mediaType,
    });

    if (duplicate) {
      // Reintento de Meta de un mensaje que ya procesamos: no hacer nada más.
      return NextResponse.json({ ok: true });
    }

    await touchConversation(supabase, conversation.id, {
      preview: inboundPreview,
      incrementUnread: true,
    });

    if (isReaction) {
      // Solo lo registramos arriba para que se vea en el panel — el bot no
      // tiene nada que contestarle a una reacción.
      return NextResponse.json({ ok: true });
    }

    if (conversation.bot_paused) {
      // El admin tomó esta conversación a mano: no contestar automáticamente,
      // pero sí marcarla para que el equipo vea que hay que responder.
      await supabase
        .from("whatsapp_conversations")
        .update({ needs_attention: true })
        .eq("id", conversation.id);
      return NextResponse.json({ ok: true });
    }

    if (await isRepeatingLoop(supabase, conversation.id, inboundPreview)) {
      // Del otro lado hay algo (probablemente otro sistema automático, no
      // una persona) contestando siempre lo mismo: si seguimos respondiendo
      // quedamos en un bucle infinito entre bots. Frenamos al bot acá,
      // mandamos un único aviso, y dejamos la charla pausada para que el
      // equipo la revise a mano si hace falta.
      await supabase
        .from("whatsapp_conversations")
        .update({ bot_paused: true, needs_attention: true })
        .eq("id", conversation.id);

      const replyText =
        "Parece que estamos teniendo problemas para entendernos por acá. Avisé al equipo de Bakery Box para que te escriba directamente. ¡Gracias por tu paciencia!";
      const { waMessageId: outboundId } = await sendWhatsappMessage(fromNumber, replyText);
      await insertMessage(supabase, {
        conversationId: conversation.id,
        direction: "outbound",
        sender: "bot",
        body: replyText,
        waMessageId: outboundId,
      });
      await touchConversation(supabase, conversation.id, { preview: replyText });
      return NextResponse.json({ ok: true });
    }

    if (!isText && !isReceiptImage) {
      // No sabemos procesar audios, imágenes, documentos, etc: avisarle al
      // cliente que nos escriba en texto en vez de dejarlo sin respuesta.
      // Una foto o PDF que SÍ reconocimos como comprobante de pago no entra
      // aquí — sigue de largo hasta el bot normal, más abajo.
      const replyText = nonTextReply(isNew);
      const { waMessageId: outboundId } = await sendWhatsappMessage(fromNumber, replyText);
      await insertMessage(supabase, {
        conversationId: conversation.id,
        direction: "outbound",
        sender: "bot",
        body: replyText,
        waMessageId: outboundId,
      });
      await touchConversation(supabase, conversation.id, { preview: replyText });
      return NextResponse.json({ ok: true });
    }

    // Si el cliente manda varios mensajes seguidos (ej: "Holaa", "Sii
    // perfecto", "Confirmo" en un par de segundos), cada uno llega como un
    // webhook distinto y, sin esto, cada uno disparaba su propia corrida
    // del bot EN PARALELO — con el historial todavía desactualizado, las
    // dos podían terminar confirmando el mismo pedido y duplicándolo. Esta
    // traba hace que, para esta conversación, se procese un mensaje a la
    // vez: el segundo espera a que el primero termine (y así lee el
    // historial ya actualizado) antes de armar su propia respuesta.
    const lockAcquired = await acquireBotLockWithWait(supabase, conversation.id);

    try {
      const history = await getRecentMessages(supabase, conversation.id, 20);

      const botIncomingText = isReceiptImage
        ? `[Mensaje del sistema, no del cliente: mandó un archivo (foto o PDF) que parece ser un comprobante de pago o transferencia bancaria.${
            receiptAmount ? ` Monto que se llegó a leer en la imagen: ${receiptAmount}.` : " No se pudo leer el monto con claridad."
          } Agradecele de forma breve y cálida, y avisale que el equipo va a confirmar la recepción del pago. No llames a create_order, cancel_order ni notify_team por este mensaje.]`
        : text;

      let replyText: string;
      let aiFailed = false;
      try {
        replyText = await runBotTurn({
          supabase,
          customerPhone: fromNumber,
          history: history.slice(0, -1), // el mensaje que acabamos de guardar ya va como incomingText
          incomingText: botIncomingText,
        });
      } catch (err) {
        // Si falla la IA (sin crédito, caída del servicio, etc.) no dejamos al
        // cliente sin respuesta: le avisamos que el equipo lo va a contactar y
        // marcamos la charla para que se note en el panel, en vez de fallar en
        // silencio como antes.
        console.error("Error al generar la respuesta del bot:", err);
        aiFailed = true;
        replyText =
          "Perdón, tuve un problema técnico para responder. El equipo de Bakery Box te va a contactar en breve.";
      }

      const { waMessageId: outboundId } = await sendWhatsappMessage(fromNumber, replyText);
      await insertMessage(supabase, {
        conversationId: conversation.id,
        direction: "outbound",
        sender: "bot",
        body: replyText,
        waMessageId: outboundId,
      });
      await touchConversation(supabase, conversation.id, { preview: replyText });

      if (aiFailed || isReceiptImage) {
        await supabase
          .from("whatsapp_conversations")
          .update({ needs_attention: true })
          .eq("id", conversation.id);
      }
    } finally {
      if (lockAcquired) {
        await releaseBotLock(supabase, conversation.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de WhatsApp:", err);
    // Devolvemos 200 igual: si devolvemos error, Meta reintenta y podríamos
    // terminar respondiendo el mismo mensaje varias veces.
    return NextResponse.json({ ok: false });
  }
}
