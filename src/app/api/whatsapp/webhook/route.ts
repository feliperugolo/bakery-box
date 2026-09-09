import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateConversation, insertMessage, touchConversation, getRecentMessages } from "@/lib/whatsapp/store";
import { runBotTurn } from "@/lib/whatsapp/agent";
import { sendWhatsappMessage } from "@/lib/whatsapp/send";

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
    if (!message || message.type !== "text") {
      return NextResponse.json({ ok: true });
    }

    const fromNumber: string = message.from;
    const text: string = message.text?.body || "";
    const waMessageId: string = message.id;
    const contactName: string | undefined =
      change?.contacts?.[0]?.profile?.name;

    const supabase = createServiceClient();
    const conversation = await getOrCreateConversation(supabase, fromNumber, contactName);

    const { duplicate } = await insertMessage(supabase, {
      conversationId: conversation.id,
      direction: "inbound",
      sender: "customer",
      body: text,
      waMessageId,
    });

    if (duplicate) {
      // Reintento de Meta de un mensaje que ya procesamos: no hacer nada más.
      return NextResponse.json({ ok: true });
    }

    await touchConversation(supabase, conversation.id, {
      preview: text,
      incrementUnread: true,
    });

    if (conversation.bot_paused) {
      // El admin tomó esta conversación a mano: no contestar automáticamente.
      return NextResponse.json({ ok: true });
    }

    const history = await getRecentMessages(supabase, conversation.id, 20);
    const replyText = await runBotTurn({
      supabase,
      customerPhone: fromNumber,
      history: history.slice(0, -1), // el mensaje que acabamos de guardar ya va como incomingText
      incomingText: text,
    });

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
  } catch (err) {
    console.error("Error procesando webhook de WhatsApp:", err);
    // Devolvemos 200 igual: si devolvemos error, Meta reintenta y podríamos
    // terminar respondiendo el mismo mensaje varias veces.
    return NextResponse.json({ ok: false });
  }
}
