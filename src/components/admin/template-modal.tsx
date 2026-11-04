"use client";

import { useEffect, useState } from "react";
import { X, Send, ChevronLeft, FileText } from "lucide-react";

type TemplateParam = { name: string; example: string | null };
type Template = {
  name: string;
  language: string;
  category: string;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  params: TemplateParam[];
};

/**
 * Un nombre de parámetro que probablemente sea "el nombre del cliente" —
 * lo usamos para precargar ese campo solo, en vez de dejar todo en blanco.
 */
function looksLikeNameParam(paramName: string) {
  const n = paramName.toLowerCase();
  return n.includes("name") || n.includes("nombre");
}

function fillTemplate(template: Template, values: Record<string, string>) {
  let text = template.bodyText;
  for (const p of template.params) {
    const value = values[p.name] || `{{${p.name}}}`;
    text = text.split(`{{${p.name}}}`).join(value);
  }
  return text;
}

/**
 * Elegir y mandar una plantilla aprobada por Meta, a mano. Se usa en dos
 * casos (ver `mode`):
 *  - "new": arrancar una conversación con alguien que todavía no le
 *    escribió a Bakery Box — primero pide teléfono/nombre.
 *  - "existing": mandarle una plantilla a un contacto que ya tiene
 *    conversación (ej: pasaron más de 24hs y el texto libre no entra) —
 *    va directo a elegir la plantilla, usando los datos que ya tenemos.
 * Las plantillas se traen en vivo de Meta (vía /api/admin/whatsapp/templates)
 * así que cualquier plantilla nueva que se apruebe aparece sola, sin tocar
 * código.
 */
export default function TemplateModal({
  mode,
  conversationId,
  initialPhone = "",
  initialName = "",
  onClose,
  onSent,
}: {
  mode: "new" | "existing";
  conversationId?: string;
  initialPhone?: string;
  initialName?: string;
  onClose: () => void;
  onSent?: (conversationId: string) => void;
}) {
  const [step, setStep] = useState<"contact" | "pick" | "fill" | "done">(
    mode === "new" ? "contact" : "pick"
  );
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);

  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "pick" || templates !== null) return;
    let active = true;
    fetch("/api/admin/whatsapp/templates")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.error) {
          setLoadError(data.error);
        } else {
          setTemplates(data.templates || []);
        }
      })
      .catch(() => {
        if (active) setLoadError("No se pudieron cargar las plantillas.");
      });
    return () => {
      active = false;
    };
  }, [step, templates]);

  const pickTemplate = (t: Template) => {
    const initialValues: Record<string, string> = {};
    for (const p of t.params) {
      initialValues[p.name] = looksLikeNameParam(p.name) && name ? name : p.example || "";
    }
    setSelected(t);
    setValues(initialValues);
    setStep("fill");
  };

  const send = async () => {
    if (!selected) return;
    if (mode === "new" && (!phone.trim() || !name.trim())) {
      setSendError("Falta el teléfono o el nombre.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: mode === "existing" ? conversationId : undefined,
          phoneNumber: mode === "existing" ? initialPhone : phone,
          customerName: mode === "existing" ? initialName : name,
          templateName: selected.name,
          languageCode: selected.language,
          params: selected.params.map((p) => ({ name: p.name, value: values[p.name] || "" })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
      setStep("done");
      onSent?.(data.conversationId);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-brown-900">Mandar plantilla</h3>
          <button onClick={onClose} className="text-brown-800/50 hover:text-red-600" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "contact" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-brown-800/60">
              Para alguien que todavía no te escribió, WhatsApp exige que el
              primer mensaje sea una plantilla ya aprobada por Meta.
            </p>
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
            <button
              onClick={() => {
                if (!phone.trim() || !name.trim()) {
                  setSendError("Ingresá el nombre y el teléfono.");
                  return;
                }
                setSendError(null);
                setStep("pick");
              }}
              className="mt-1 rounded-full bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800"
            >
              Elegir plantilla
            </button>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
          </div>
        )}

        {step === "pick" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {loadError && <p className="text-sm text-red-600">{loadError}</p>}
            {!templates && !loadError && (
              <p className="text-sm text-brown-800/60">Cargando plantillas…</p>
            )}
            {templates && templates.length === 0 && (
              <p className="text-sm text-brown-800/60">
                No hay plantillas aprobadas todavía. Las que tengas en revisión
                van a aparecer acá solas en cuanto Meta las apruebe.
              </p>
            )}
            {templates?.map((t) => (
              <button
                key={`${t.name}_${t.language}`}
                onClick={() => pickTemplate(t)}
                className="flex flex-col gap-0.5 rounded-xl border border-brown-900/10 bg-cream px-3.5 py-2.5 text-left transition hover:border-gold-500 hover:bg-cream-dark"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-brown-900">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brown-800/50" />
                  {t.name}
                  <span className="rounded-full bg-brown-900/10 px-1.5 py-0.5 text-[10px] font-normal text-brown-800/60">
                    {t.category}
                  </span>
                </span>
                <span className="truncate text-xs text-brown-800/60">{t.bodyText}</span>
              </button>
            ))}
          </div>
        )}

        {step === "fill" && selected && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <button
              onClick={() => setStep("pick")}
              className="flex items-center gap-1 self-start text-xs text-brown-800/60 hover:text-brown-900"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Elegir otra plantilla
            </button>
            <div className="rounded-xl bg-cream-dark px-3.5 py-3 text-sm text-brown-900 whitespace-pre-wrap">
              {fillTemplate(selected, values)}
            </div>
            {selected.params.map((p) => (
              <div key={p.name}>
                <label className="mb-1 block text-sm font-medium text-brown-800">{p.name}</label>
                <input
                  value={values[p.name] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                  className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                  placeholder={p.example || ""}
                />
              </div>
            ))}
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            <button
              onClick={send}
              disabled={sending}
              className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Enviando..." : "Mandar plantilla"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-sm text-brown-800/80">
            <p>Listo, se mandó la plantilla.</p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
