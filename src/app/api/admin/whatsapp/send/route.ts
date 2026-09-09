import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertMessage, touchConversation } from "@/lib/whatsapp/store";
import { sendWhatsappMessage } from "@/lib/whatsapp/send";

/**
 * El admin responde a mano desde el panel. Esto pasa siempre por el
 * servidor porque el token de WhatsApp es secreto y no puede llegar al
 * navegador. Pausa el bot automáticamente para esa conversación: si el
 * admin está escribiendo a mano, el bot no debe contestar por arriba.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { conversationId, phoneNumber, body } = await request.json();

  if (!conversationId || !phoneNumber || !body?.trim()) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  try {
    const { waMessageId } = await sendWhatsappMessage(phoneNumber, body.trim());

    await insertMessage(supabase, {
      conversationId,
      direction: "outbound",
      sender: "admin",
      body: body.trim(),
      waMessageId,
    });

    await touchConversation(supabase, conversationId, { preview: body.trim() });
    await supabase
      .from("whatsapp_conversations")
      .update({ bot_paused: true })
      .eq("id", conversationId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error enviando mensaje manual de WhatsApp:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
