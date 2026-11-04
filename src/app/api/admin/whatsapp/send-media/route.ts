import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertMessage, touchConversation } from "@/lib/whatsapp/store";
import { uploadWhatsappMedia, sendWhatsappMedia, WhatsappMediaKind } from "@/lib/whatsapp/send";

/**
 * Mandar una foto o un documento a mano desde el panel de admin (ej: una
 * foto del producto, un comprobante, un PDF con instrucciones). Primero
 * subimos el archivo a WhatsApp para poder enviarlo, y por separado lo
 * guardamos también en Supabase Storage (así queda visible en el panel con
 * una URL firmada, igual que los archivos que mandan los clientes) — son
 * dos "storages" distintos que no se pueden compartir.
 */

function mediaKindFor(mimeType: string): WhatsappMediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  // WhatsApp acepta bastantes tipos de documento (pdf, doc, xls, etc.) — lo
  // tratamos todo como "document" salvo los tres casos de arriba.
  return "document";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const conversationId = form.get("conversationId");
  const phoneNumber = form.get("phoneNumber");
  const caption = form.get("caption");
  const replyToWaMessageId = form.get("replyToWaMessageId");

  if (!(file instanceof File) || typeof conversationId !== "string" || typeof phoneNumber !== "string") {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const kind = mediaKindFor(mimeType);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1) Subir a WhatsApp y mandar el mensaje — si esto falla no guardamos
    // nada todavía, para no dejar un mensaje "enviado" que en realidad
    // nunca salió.
    const mediaId = await uploadWhatsappMedia(buffer, mimeType, file.name);
    const { waMessageId } = await sendWhatsappMedia(phoneNumber, mediaId, kind, {
      caption: typeof caption === "string" && caption.trim() ? caption.trim() : undefined,
      filename: kind === "document" ? file.name : undefined,
      replyToWaMessageId:
        typeof replyToWaMessageId === "string" && replyToWaMessageId ? replyToWaMessageId : undefined,
    });

    // 2) Guardarlo también en nuestro propio Storage para poder mostrarlo
    // en el panel (igual que hacemos con los archivos que llegan de
    // clientes) — si esto falla, el mensaje ya se mandó igual, así que no
    // tiramos error: simplemente queda sin preview en el panel.
    let mediaPath: string | null = null;
    if (waMessageId) {
      const ext = (mimeType.split("/")[1] || "bin").split("+")[0];
      const candidatePath = `${conversationId}/${waMessageId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("whatsapp-media")
        .upload(candidatePath, buffer, { contentType: mimeType, upsert: true });
      if (!uploadError) {
        mediaPath = candidatePath;
      } else {
        console.error("Error guardando archivo enviado en Storage:", uploadError);
      }
    }

    const previewLabel =
      kind === "image" ? "📷 Foto" : kind === "video" ? "🎥 Video" : kind === "audio" ? "🎵 Audio" : "📎 Archivo";
    const previewText =
      caption && typeof caption === "string" && caption.trim() ? `${previewLabel}: ${caption.trim()}` : previewLabel;

    await insertMessage(supabase, {
      conversationId,
      direction: "outbound",
      sender: "admin",
      body: previewText,
      waMessageId,
      mediaPath,
      mediaType: mimeType,
      replyToWaMessageId:
        typeof replyToWaMessageId === "string" && replyToWaMessageId ? replyToWaMessageId : null,
    });

    await touchConversation(supabase, conversationId, { preview: previewText });
    await supabase
      .from("whatsapp_conversations")
      .update({ bot_paused: true })
      .eq("id", conversationId);

    return NextResponse.json({ ok: true, mediaPath });
  } catch (err) {
    console.error("Error enviando archivo de WhatsApp:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
