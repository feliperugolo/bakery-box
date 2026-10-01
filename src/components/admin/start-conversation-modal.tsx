"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";

/**
 * Modal para mandarle a alguien el primer mensaje de WhatsApp, cuando
 * todavía no te escribió (ej: hizo un pedido en la página pero no lo
 * confirmó por WhatsApp, o un contacto nuevo cualquiera). Usa la plantilla
 * aprobada vía /api/admin/whatsapp/send-template — no manda texto libre.
 */
export default function StartConversationModal({
  initialPhone = "",
  initialName = "",
  onClose,
  onSent,
}: {
  initialPhone?: string;
  initialName?: string;
  onClose: () => void;
  onSent?: (conversationId: string) => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const send = async () => {
    setError(null);
    if (!phone.trim()) {
      setError("Ingresá el teléfono.");
      return;
    }
    if (!name.trim()) {
      setError("Ingresá el nombre (lo usa la plantilla).");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, customerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
      setDone(true);
      onSent?.(data.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-brown-900">Mandar primer mensaje</h3>
          <button onClick={onClose} className="text-brown-800/50 hover:text-red-600" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="text-sm text-brown-800/80">
            <p>
              Listo, se mandó el mensaje. Cuando responda vas a ver la charla en
              la bandeja de WhatsApp como cualquier otra.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-brown-800/60">
              Para alguien que todavía no te escribió, WhatsApp exige que el
              primer mensaje sea una plantilla ya aprobada por Meta — por eso
              acá no se escribe el texto libre. Después de este mensaje la
              charla sigue normal.
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-brown-800">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown-800">
                  Teléfono (con código de país)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                  placeholder="5491122334455"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={send}
                disabled={sending}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Enviando..." : "Mandar mensaje"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
