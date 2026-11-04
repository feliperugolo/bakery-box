"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, FileText, Pause, Play, Send, User, MessageCircleWarning, BellRing, UserPlus, TriangleAlert, Check, CheckCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WhatsappConversation, WhatsappMessage } from "@/lib/types";
import StartConversationModal from "./start-conversation-modal";

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

/**
 * El tilde de estado, igual que en la app de WhatsApp: reloj mientras Meta
 * todavía no confirmó el envío, un tilde cuando lo mandó, dos tildes
 * cuando le llegó al cliente, y dos tildes celestes cuando lo leyó. Un
 * mensaje fallido no pasa por acá — tiene su propio aviso en rojo aparte.
 */
function DeliveryTick({ status }: { status: string | null }) {
  if (status === "read") {
    return <CheckCheck className="h-3 w-3 shrink-0 text-sky-300" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3 w-3 shrink-0" />;
  }
  if (status === "sent") {
    return <Check className="h-3 w-3 shrink-0" />;
  }
  // Todavía no llegó ningún estado de Meta — recién lo mandamos.
  return <Clock className="h-2.5 w-2.5 shrink-0" />;
}

// Mensajes "optimistas": los que mostramos apenas el admin aprieta Enviar,
// antes de que confirme el servidor. Se identifican con este prefijo en el
// id para poder distinguirlos y reconciliarlos cuando llega el mensaje real
// (por Realtime o en una relectura).
const OPTIMISTIC_PREFIX = "optimistic-";

function isSameOptimisticMessage(optimistic: WhatsappMessage, real: WhatsappMessage) {
  return (
    optimistic.id.startsWith(OPTIMISTIC_PREFIX) &&
    optimistic.conversation_id === real.conversation_id &&
    optimistic.sender === real.sender &&
    optimistic.body === real.body
  );
}

/**
 * Reemplaza, dentro de la lista de mensajes actual, el mensaje optimista que
 * corresponda (si hay uno) por el mensaje real que llegó del servidor —  o
 * simplemente lo agrega si no había ninguno pendiente. Evita que se vea
 * duplicado el mensaje que el admin acaba de mandar.
 */
function reconcileMessage(prev: WhatsappMessage[], real: WhatsappMessage): WhatsappMessage[] {
  if (prev.some((m) => m.id === real.id)) return prev;
  const pendingIndex = prev.findIndex((m) => isSameOptimisticMessage(m, real));
  if (pendingIndex === -1) return [...prev, real];
  const next = [...prev];
  next[pendingIndex] = real;
  return next;
}

/**
 * Misma idea pero para una relectura completa (reemplazamos todo por lo que
 * diga el servidor, conservando únicamente los mensajes optimistas que
 * todavía no tengan su contraparte real confirmada).
 */
function mergeServerMessages(prev: WhatsappMessage[], serverRows: WhatsappMessage[]): WhatsappMessage[] {
  const stillPending = prev.filter(
    (m) => m.id.startsWith(OPTIMISTIC_PREFIX) && !serverRows.some((row) => isSameOptimisticMessage(m, row))
  );
  return [...serverRows, ...stillPending];
}

/**
 * Los archivos que mandan los clientes (fotos o PDFs de comprobantes de
 * pago) se guardan en un bucket privado de Storage, así que no hay una URL
 * pública fija para usarla directo: hay que pedirle a Supabase una URL
 * firmada (temporal) cada vez que se muestran. Una foto se ve inline; un
 * PDF se muestra como link para abrir, porque no se puede incrustar igual.
 */
function WhatsappMediaPreview({ path, mediaType }: { path: string; mediaType: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const isPdf = mediaType === "application/pdf";

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.storage
      .from("whatsapp-media")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (active && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (isPdf) {
    return (
      <a
        href={url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={`mb-1.5 flex items-center gap-2 rounded-lg bg-brown-900/10 px-3 py-2 text-xs font-medium text-brown-900 ${
          url ? "hover:bg-brown-900/20" : "pointer-events-none opacity-60"
        }`}
      >
        <FileText className="h-4 w-4 shrink-0" />
        {url ? "Ver comprobante (PDF)" : "Cargando PDF…"}
      </a>
    );
  }

  if (!url) {
    return (
      <div className="mb-1.5 flex h-32 w-40 items-center justify-center rounded-lg bg-brown-900/10 text-xs text-brown-800/50">
        Cargando imagen…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Imagen enviada por el cliente"
      className="mb-1.5 max-h-64 max-w-full rounded-lg object-contain"
    />
  );
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
  const [showNewContact, setShowNewContact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const optimisticCounter = useRef(0);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  // Realtime: nuevas conversaciones o cambios (último mensaje, pausa, no leídos).
  useEffect(() => {
    const supabase = createClient();

    const loadConversations = async () => {
      const { data } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (data) setConversations(data as WhatsappConversation[]);
    };

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

    // La conexión de Realtime se puede quedar "dormida" sin avisar cuando el
    // celular bloquea la pantalla o el navegador manda la pestaña a segundo
    // plano un rato largo (muy común en el celular). En vez de depender
    // solo del socket para enterarnos de cambios, cada vez que el panel
    // vuelve a primer plano releemos todo de una — así nunca hace falta
    // hacer un refresh manual de la página para ver lo último.
    const handleVisible = () => {
      if (document.visibilityState === "visible") loadConversations();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    window.addEventListener("online", handleVisible);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
      window.removeEventListener("online", handleVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  // Cargar mensajes de la conversación seleccionada + suscribirse a los nuevos.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const loadMessages = async () => {
      if (!selectedId) return;
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (active && data) {
        setMessages((prev) => mergeServerMessages(prev, data as WhatsappMessage[]));
      }
    };

    (async () => {
      if (!selectedId) {
        if (active) setMessages([]);
        return;
      }

      await loadMessages();

      await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0, needs_attention: false })
        .eq("id", selectedId);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId ? { ...c, unread_count: 0, needs_attention: false } : c
        )
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
          setMessages((prev) => reconcileMessage(prev, payload.new as WhatsappMessage));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          // Esto es lo que trae, por ejemplo, el estado de entrega real de
          // Meta (delivered/failed) una vez que llega su webhook.
          const row = payload.new as WhatsappMessage;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        }
      )
      .subscribe();

    // Mismo motivo que en la lista de conversaciones: al volver a primer
    // plano, releer el hilo entero para no depender solo del socket.
    const handleVisible = () => {
      if (document.visibilityState === "visible") loadMessages();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    window.addEventListener("online", handleVisible);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
      window.removeEventListener("online", handleVisible);
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
    const body = draft.trim();
    const nowIso = new Date().toISOString();
    const optimisticId = `${OPTIMISTIC_PREFIX}${selected.id}-${optimisticCounter.current++}`;

    setSending(true);
    setError(null);
    setDraft("");

    // Mostramos el mensaje de una, sin esperar la ida y vuelta al servidor
    // (que primero le pega a la API de WhatsApp): así no se siente lento
    // mandar un mensaje a mano. Cuando confirme el servidor y/o llegue por
    // Realtime, este placeholder se reemplaza solo por el mensaje real.
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        conversation_id: selected.id,
        direction: "outbound",
        sender: "admin",
        body,
        wa_message_id: null,
        media_path: null,
        media_type: null,
        created_at: nowIso,
        delivery_status: null,
        delivery_error: null,
      },
    ]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              bot_paused: true,
              last_message_preview: body.slice(0, 200),
              last_message_at: nowIso,
            }
          : c
      )
    );

    try {
      const res = await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected.id,
          phoneNumber: selected.phone_number,
          body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
      // No se pudo mandar en serio: sacamos el placeholder para no dejar
      // una burbuja "enviada" que en realidad nunca salió, y devolvemos el
      // texto al cuadro para que no se pierda lo que había escrito.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(body);
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
        <button
          onClick={() => setShowNewContact(true)}
          className="mt-2 flex items-center gap-1.5 rounded-full bg-brown-900 px-4 py-2 text-sm font-medium text-cream transition hover:bg-brown-800"
        >
          <UserPlus className="h-4 w-4" />
          Mandar primer mensaje
        </button>
        {showNewContact && (
          <StartConversationModal
            onClose={() => setShowNewContact(false)}
            onSent={(id) => {
              setShowNewContact(false);
              setSelectedId(id);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      {/* Lista de conversaciones */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <div className="flex items-center justify-between gap-2 border-b border-brown-900/10 px-3 py-2.5">
          <span className="text-xs font-medium text-brown-800/50">Conversaciones</span>
          <button
            onClick={() => setShowNewContact(true)}
            className="flex items-center gap-1 rounded-full bg-cream-dark px-3 py-1.5 text-xs font-medium text-brown-800 transition hover:bg-brown-900/10"
            title="Mandar el primer mensaje a alguien que todavía no te escribió"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Nuevo
          </button>
        </div>
        <ul className="divide-y divide-brown-900/5 overflow-y-auto">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => setSelectedId(conv.id)}
                className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition ${
                  conv.needs_attention
                    ? "bg-red-500/5 hover:bg-red-500/10"
                    : conv.id === selectedId
                      ? "bg-cream-dark"
                      : "hover:bg-cream-dark/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-brown-900">
                    {conv.needs_attention && (
                      <BellRing className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    )}
                    <span className="truncate">{displayName(conv)}</span>
                  </span>
                  {conv.unread_count > 0 && (
                    <span
                      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white ${
                        conv.needs_attention ? "bg-red-500" : "bg-gold-500"
                      }`}
                    >
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
                  const isPending = msg.id.startsWith(OPTIMISTIC_PREFIX);
                  const failed = !fromCustomer && msg.delivery_status === "failed";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${fromCustomer ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          isPending ? "opacity-60" : ""
                        } ${
                          failed
                            ? "border border-red-400 bg-red-500/10 text-brown-900"
                            : fromCustomer
                              ? "bg-cream-dark text-brown-900"
                              : msg.sender === "admin"
                                ? "bg-brown-900 text-cream"
                                : "bg-gold-500/90 text-white"
                        }`}
                      >
                        {msg.media_path && (
                          <WhatsappMediaPreview path={msg.media_path} mediaType={msg.media_type} />
                        )}
                        <p>{msg.body}</p>
                        <div
                          className={`mt-1 flex items-center gap-1 text-[10px] ${
                            failed ? "text-red-600" : fromCustomer ? "text-brown-800/40" : "text-white/70"
                          }`}
                        >
                          {!fromCustomer &&
                            (msg.sender === "admin" ? (
                              <User className="h-2.5 w-2.5" />
                            ) : (
                              <Bot className="h-2.5 w-2.5" />
                            ))}
                          {isPending ? "Enviando…" : timeLabel(msg.created_at)}
                          {!isPending && !fromCustomer && !failed && (
                            <DeliveryTick status={msg.delivery_status} />
                          )}
                        </div>
                      </div>
                      {failed && (
                        <p
                          className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600"
                          title={msg.delivery_error || undefined}
                        >
                          <TriangleAlert className="h-3 w-3 shrink-0" />
                          No se pudo entregar
                          {msg.delivery_error ? ` — ${msg.delivery_error}` : ""}
                        </p>
                      )}
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
    {showNewContact && (
      <StartConversationModal
        onClose={() => setShowNewContact(false)}
        onSent={(id) => {
          setShowNewContact(false);
          setSelectedId(id);
        }}
      />
    )}
    </>
  );
}
