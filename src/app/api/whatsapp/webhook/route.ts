import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getOrCreateConversation,
  insertMessage,
  touchConversation,
  getRecentMessages,
  isRepeatingLoop,
} from "@/lib/whatsapp/store";
import { runBotTurn } from "@/lib/whatsapp/agent";
import { sendWhatsappMessage } from "@/lib/whatsapp/send";

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
    const text: string = isText ? message.text?.body || "" : "";

    const supabase = createServiceClient();
    const { conversation, isNew } = await getOrCreateConversation(supabase, fromNumber, contactName);

    const { duplicate } = await insertMessage(supabase, {
      conversationId: conversation.id,
      direction: "inbound",
      sender: "customer",
      body: isText ? text : nonTextPreview(message.type),
      waMessageId,
    });

    if (duplicate) {
      // Reintento de Meta de un mensaje que ya procesamos: no hacer nada más.
      return NextResponse.json({ ok: true });
    }

    await touchConversation(supabase, conversation.id, {
      preview: isText ? text : nonTextPreview(message.type),
      incrementUnread: true,
    });

    if (conversation.bot_paused) {
      // El admin tomó esta conversación a mano: no contestar automáticamente,
      // pero sí marcarla para que el equipo vea que hay que responder.
      await supabase
        .from("whatsapp_conversations")
        .update({ needs_attention: true })
        .eq("id", conversation.id);
      return NextResponse.json({ ok: true });
    }

    const inboundBody = isText ? text : nonTextPreview(message.type);
    if (await isRepeatingLoop(supabase, conversation.id, inboundBody)) {
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

    if (!isText) {
      // No sabemos procesar audios, imágenes, etc: avisarle al cliente que
      // nos escriba en texto en vez de dejarlo sin respuesta.
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

    const history = await getRecentMessages(supabase, conversation.id, 20);

    let replyText: string;
    let aiFailed = false;
    try {
      replyText = await runBotTurn({
        supabase,
        customerPhone: fromNumber,
        history: history.slice(0, -1), // el mensaje que acabamos de guardar ya va como incomingText
        incomingText: text,
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

    if (aiFailed) {
      await supabase
        .from("whatsapp_conversations")
        .update({ needs_attention: true })
        .eq("id", conversation.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de WhatsApp:", err);
    // Devolvemos 200 igual: si devolvemos error, Meta reintenta y podríamos
    // terminar respondiendo el mismo mensaje varias veces.
    return NextResponse.json({ ok: false });
  }
}
