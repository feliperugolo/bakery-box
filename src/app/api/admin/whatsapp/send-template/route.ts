import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation, insertMessage, touchConversation } from "@/lib/whatsapp/store";
import { sendWhatsappTemplate } from "@/lib/whatsapp/send";

/**
 * Arranca una conversación de WhatsApp con alguien que todavía no le
 * escribió a Bakery Box (ej: hizo un pedido en la página pero no llegó a
 * mandarlo por WhatsApp, o un contacto nuevo cualquiera). WhatsApp no deja
 * mandar texto libre en ese caso: el primer mensaje tiene que ser una
 * plantilla aprobada por Meta, por eso esto usa sendWhatsappTemplate en vez
 * de sendWhatsappMessage. El nombre/idioma de la plantilla se configuran
 * por variable de entorno porque dependen de cómo haya quedado aprobada.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { phoneNumber, customerName } = await request.json();
  const cleanPhone = (phoneNumber || "").replace(/\D/g, "");
  const name = (customerName || "").trim();

  if (!cleanPhone) {
    return NextResponse.json({ error: "Falta el teléfono" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json(
      { error: "Falta el nombre (la plantilla lo necesita)" },
      { status: 400 }
    );
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "primer_contacto_pedido";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || "es_AR";

  try {
    const { waMessageId } = await sendWhatsappTemplate(cleanPhone, templateName, languageCode, [
      name,
    ]);

    const { conversation } = await getOrCreateConversation(supabase, cleanPhone, name);

    const previewText = `[Plantilla de WhatsApp enviada a ${name}]`;
    await insertMessage(supabase, {
      conversationId: conversation.id,
      direction: "outbound",
      sender: "admin",
      body: previewText,
      waMessageId,
    });
    await touchConversation(supabase, conversation.id, { preview: previewText });

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (err) {
    console.error("Error enviando plantilla de WhatsApp:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
