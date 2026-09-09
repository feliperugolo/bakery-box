import type { SupabaseClient } from "@supabase/supabase-js";
import { WhatsappConversation, WhatsappSender, WhatsappDirection } from "@/lib/types";

/**
 * Helpers para leer/escribir conversaciones y mensajes de WhatsApp.
 * Reciben el cliente de Supabase de afuera porque según quién llame puede
 * ser el cliente con service role (el webhook, sin sesión) o el cliente
 * autenticado normal (una acción del admin logueado).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function getOrCreateConversation(
  supabase: AnySupabaseClient,
  phoneNumber: string,
  customerName?: string
): Promise<WhatsappConversation> {
  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (existing) {
    if (customerName && !existing.customer_name) {
      await supabase
        .from("whatsapp_conversations")
        .update({ customer_name: customerName })
        .eq("id", existing.id);
      existing.customer_name = customerName;
    }
    return existing as WhatsappConversation;
  }

  const { data: created, error } = await supabase
    .from("whatsapp_conversations")
    .insert({ phone_number: phoneNumber, customer_name: customerName || "" })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`No se pudo crear la conversación: ${error?.message}`);
  }

  return created as WhatsappConversation;
}

export async function insertMessage(
  supabase: AnySupabaseClient,
  args: {
    conversationId: string;
    direction: WhatsappDirection;
    sender: WhatsappSender;
    body: string;
    waMessageId?: string | null;
  }
) {
  const { error } = await supabase.from("whatsapp_messages").insert({
    conversation_id: args.conversationId,
    direction: args.direction,
    sender: args.sender,
    body: args.body,
    wa_message_id: args.waMessageId || null,
  });

  if (error) {
    // Si ya procesamos este mensaje de Meta antes (reintento del webhook),
    // el índice único de wa_message_id lo rechaza acá: no es un error real.
    if (error.code === "23505") return { duplicate: true };
    throw new Error(`No se pudo guardar el mensaje: ${error.message}`);
  }

  return { duplicate: false };
}

export async function touchConversation(
  supabase: AnySupabaseClient,
  conversationId: string,
  args: { preview: string; incrementUnread?: boolean }
) {
  if (args.incrementUnread) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("unread_count")
      .eq("id", conversationId)
      .maybeSingle();

    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: args.preview.slice(0, 200),
        unread_count: (data?.unread_count || 0) + 1,
      })
      .eq("id", conversationId);
    return;
  }

  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: args.preview.slice(0, 200),
    })
    .eq("id", conversationId);
}

export async function getRecentMessages(
  supabase: AnySupabaseClient,
  conversationId: string,
  limit = 20
) {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).reverse();
}
