"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Pause, Play, Send, User, MessageCircleWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WhatsappConversation, WhatsappMessage } from "@/lib/types";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayName(conv: WhatsappConversation) {
  return conv.customer_name?.trim() || conv.phone_number;
}

export default function WhatsappInbox({
  initialConversations,
}: {
  initialConversations: WhatsappConversation[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id || null
  );
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  // Realtime: nuevas conversaciones o cambios (último mensaje, pausa, no leídos).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("whatsapp_conversations_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        (payload) => {
          setConversations((prev) => {
            const row = payload.new as WhatsappConversation;
            if (!row?.id) return prev;
            const exists = prev.some((c) => c.id === row.id);
            const next = exists
              ? prev.map((c) => (c.id === row.id ? row : c))
              : [row, ...prev];
            return [...next].sort(
              (a, b) =>
                new Date(b.last_message_at).getTime() -
                new Date(a.last_message_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cargar mensajes de la conversación seleccionada + suscribirse a los nuevos.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    (async () => {
      if (!selectedId) {
        if (active) setMessages([]);
        return;
      }

      const { data } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (active) setMessages((data as WhatsappMessage[]) || []);

      await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", selectedId);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
      );
    })();

    if (!selectedId) {
      return () => {
        active = false;
      };
    }

    const channel = supabase
      .channel(`whatsapp_messages_${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as WhatsappMessage]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const togglePause = async () => {
    if (!selected) return;
    const supabase = createClient();
    const nextPaused = !selected.bot_paused;
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, bot_paused: nextPaused } : c))
    );
    await supabase
      .from("whatsapp_conversations")
      .update({ bot_paused: nextPaused })
      .eq("id", selected.id);
  };

  const send = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected.id,
          phoneNumber: selected.phone_number,
          body: draft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
      setDraft("");
      setConversations((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, bot_paused: true } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-paper p-10 text-center shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <MessageCircleWarning className="h-10 w-10 text-brown-800/25" strokeWidth={1.25} />
        <p className="text-brown-800/70">
          Todavía no llegó ningún mensaje de WhatsApp. En cuanto un cliente le
          escriba al número de Bakery Box, la conversación va a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      {/* Lista de conversaciones */}
      <div className="overflow-y-auto rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <ul className="divide-y divide-brown-900/5">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => setSelectedId(conv.id)}
                className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition ${
                  conv.id === selectedId ? "bg-cream-dark" : "hover:bg-cream-dark/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-brown-900">
                    {displayName(conv)}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold-500 px-1 text-[11px] font-semibold text-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <span className="truncate text-xs text-brown-800/60">
                  {conv.last_message_preview || "Sin mensajes"}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      conv.bot_paused
                        ? "bg-brown-900/10 text-brown-800/70"
                        : "bg-gold-500/15 text-gold-500"
                    }`}
                  >
                    {conv.bot_paused ? (
                      <>
                        <Pause className="h-2.5 w-2.5" /> A mano
                      </>
                    ) : (
                      <>
                        <Bot className="h-2.5 w-2.5" /> Bot activo
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-brown-800/40">
                    {timeLabel(conv.last_message_at)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Hilo de mensajes */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-brown-900/10 px-5 py-3.5">
              <div>
                <p className="font-medium text-brown-900">{displayName(selected)}</p>
                <p className="text-xs text-brown-800/50">+{selected.phone_number}</p>
              </div>
              <button
                onClick={togglePause}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  selected.bot_paused
                    ? "bg-gold-500 text-white hover:brightness-95"
                    : "bg-cream-dark text-brown-800 hover:bg-brown-900/10"
                }`}
              >
                {selected.bot_paused ? (
                  <>
                    <Play className="h-3.5 w-3.5" /> Reactivar bot
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5" /> Tomar la charla
                  </>
                )}
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-3">
                {messages.map((msg) => {
                  const fromCustomer = msg.direction === "inbound";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          fromCustomer
                            ? "bg-cream-dark text-brown-900"
                            : msg.sender === "admin"
                              ? "bg-brown-900 text-cream"
                              : "bg-gold-500/90 text-white"
                        }`}
                      >
                        <p>{msg.body}</p>
                        <div
                          className={`mt-1 flex items-center gap-1 text-[10px] ${
                            fromCustomer ? "text-brown-800/40" : "text-white/70"
                          }`}
                        >
                          {!fromCustomer &&
                            (msg.sender === "admin" ? (
                              <User className="h-2.5 w-2.5" />
                            ) : (
                              <Bot className="h-2.5 w-2.5" />
                            ))}
                          {timeLabel(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-brown-900/10 p-3">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Escribí un mensaje a mano (pausa el bot para esta charla)..."
                  rows={1}
                  className="max-h-32 flex-1 resize-none rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="Enviar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brown-900 text-cream transition hover:bg-brown-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-brown-800/50">
            Elegí una conversación
          </div>
        )}
      </div>
    </div>
  );
}
