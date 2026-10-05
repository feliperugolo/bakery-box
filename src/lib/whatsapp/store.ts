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
): Promise<{ conversation: WhatsappConversation; isNew: boolean }> {
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
    return { conversation: existing as WhatsappConversation, isNew: false };
  }

  const { data: created, error } = await supabase
    .from("whatsapp_conversations")
    .insert({ phone_number: phoneNumber, customer_name: customerName || "" })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`No se pudo crear la conversación: ${error?.message}`);
  }

  return { conversation: created as WhatsappConversation, isNew: true };
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

// Cuántas veces seguidas tiene que repetirse el mismo mensaje del cliente
// para asumir que no es una persona del otro lado (ej: dos bots respondiéndose
// en bucle) y frenar al bot en vez de seguir contestando para siempre.
const LOOP_REPEAT_THRESHOLD = 3;

/**
 * Detecta si los últimos mensajes entrantes de esta conversación son todos
 * idénticos (el mismo texto, repetido LOOP_REPEAT_THRESHOLD veces seguidas).
 * Esto pasa cuando del otro lado hay otro sistema automático respondiendo
 * siempre lo mismo en vez de un cliente real — sin este freno el bot
 * contestaría indefinidamente, gastando mensajes de WhatsApp y de la API.
 */
export async function isRepeatingLoop(
  supabase: AnySupabaseClient,
  conversationId: string,
  incomingBody: string
): Promise<boolean> {
  if (!incomingBody.trim()) return false;

  const { data } = await supabase
    .from("whatsapp_messages")
    .select("body")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(LOOP_REPEAT_THRESHOLD);

  const recent = data || [];
  if (recent.length < LOOP_REPEAT_THRESHOLD) return false;

  return recent.every((m: { body: string }) => m.body === incomingBody);
}

// Cuánto puede durar como máximo una "traba" de procesamiento antes de
// considerarla abandonada (ej: la función se cayó a mitad de camino sin
// liberarla). Sin esto, un cuelgue dejaría la conversación trabada para
// siempre.
const BOT_LOCK_STALE_MS = 30_000;

/**
 * Varios mensajes seguidos del mismo cliente (ej: "Holaa", "Sii perfecto",
 * "Confirmo" mandados en un par de segundos) le llegan al webhook como
 * eventos separados, y cada uno disparaba su propia corrida del bot en
 * paralelo. Dos corridas en paralelo podían terminar las dos confirmando
 * el pedido, duplicándolo. Esta traba asegura que, para una misma
 * conversación, solo una corrida del bot esté "pensando" a la vez — las
 * demás esperan su turno (ver tryAcquireBotLock) en vez de pisarse.
 */
export async function tryAcquireBotLock(
  supabase: AnySupabaseClient,
  conversationId: string
): Promise<boolean> {
  const staleThreshold = new Date(Date.now() - BOT_LOCK_STALE_MS).toISOString();

  const { data } = await supabase
    .from("whatsapp_conversations")
    .update({
      bot_processing: true,
      bot_processing_started_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .or(`bot_processing.eq.false,bot_processing_started_at.lt.${staleThreshold}`)
    .select("id")
    .maybeSingle();

  return Boolean(data);
}

export async function releaseBotLock(
  supabase: AnySupabaseClient,
  conversationId: string
): Promise<void> {
  await supabase
    .from("whatsapp_conversations")
    .update({ bot_processing: false, bot_processing_started_at: null })
    .eq("id", conversationId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Espera hasta conseguir la traba de la conversación (con un tope de tiempo
 * para no colgar el webhook si algo quedó mal). Devuelve true si la
 * consiguió; false si se agotó la espera (caso raro) — en ese caso seguimos
 * de todas formas para no dejar al cliente sin respuesta, pero releyendo
 * el historial más reciente antes de contestar.
 */
export async function acquireBotLockWithWait(
  supabase: AnySupabaseClient,
  conversationId: string,
  maxWaitMs = 8000,
  pollMs = 400
): Promise<boolean> {
  if (await tryAcquireBotLock(supabase, conversationId)) return true;

  let waited = 0;
  while (waited < maxWaitMs) {
    await sleep(pollMs);
    waited += pollMs;
    if (await tryAcquireBotLock(supabase, conversationId)) return true;
  }

  return false;
}
