import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation, insertMessage, touchConversation } from "@/lib/whatsapp/store";
import { sendWhatsappTemplate } from "@/lib/whatsapp/send";
import { toWhatsappPhone } from "@/lib/phone";

/**
 * Manda una plantilla de WhatsApp aprobada por Meta, elegida a mano desde
 * el panel (ver /api/admin/whatsapp/templates). Se usa en dos casos:
 *  - Arrancar una conversación con alguien que todavía no le escribió a
 *    Bakery Box (WhatsApp no deja mandar texto libre en ese caso).
 *  - Mandarle una plantilla a un contacto que YA tiene conversación (ej:
 *    pasaron más de 24hs desde su último mensaje y el texto libre no
 *    entra). Para este caso se manda conversationId directo, así no hace
 *    falta volver a buscar/crear la conversación por teléfono — esto es
 *    justamente lo que evita que se duplique la charla (pasó en la
 *    práctica: "Felipe" / "Felipe Rugolo").
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const {
    conversationId,
    phoneNumber,
    customerName,
    templateName,
    languageCode,
    params,
  } = await request.json();

  const cleanPhone = toWhatsappPhone(phoneNumber || "");
  const name = (customerName || "").trim();
  const bodyParams: { name: string; value: string }[] = Array.isArray(params) ? params : [];

  if (!cleanPhone) {
    return NextResponse.json({ error: "Falta el teléfono" }, { status: 400 });
  }
  if (!templateName || !languageCode) {
    return NextResponse.json({ error: "Falta elegir la plantilla" }, { status: 400 });
  }
  // Para una conversación nueva (sin conversationId) necesitamos un nombre
  // para poder guardar el contacto — para una que ya existe, no.
  if (!conversationId && !name) {
    return NextResponse.json({ error: "Falta el nombre del contacto" }, { status: 400 });
  }

  try {
    const { waMessageId } = await sendWhatsappTemplate(cleanPhone, templateName, languageCode, bodyParams);

    const conversation = conversationId
      ? { id: conversationId as string }
      : (await getOrCreateConversation(supabase, cleanPhone, name)).conversation;

    const previewText = `[Plantilla "${templateName}" enviada]`;
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
