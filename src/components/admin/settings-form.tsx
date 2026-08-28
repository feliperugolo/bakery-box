"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SiteSettings } from "@/lib/types";

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    await supabase
      .from("site_settings")
      .update({
        store_name: form.store_name,
        whatsapp_number: form.whatsapp_number,
        bank_alias: form.bank_alias,
        bank_cbu: form.bank_cbu,
        bank_holder: form.bank_holder,
        bank_extra_note: form.bank_extra_note,
        delivery_note: form.delivery_note,
        pickup_address: form.pickup_address,
        instagram_url: form.instagram_url,
      })
      .eq("id", 1);

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-8">
      <section className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <h2 className="font-display text-xl text-brown-900">General</h2>
        <div className="mt-4 space-y-4">
          <Field
            label="Nombre de la tienda"
            value={form.store_name}
            onChange={(v) => set("store_name", v)}
          />
          <Field
            label="WhatsApp (con código de país, sin +)"
            value={form.whatsapp_number}
            onChange={(v) => set("whatsapp_number", v)}
            placeholder="5491162797363"
          />
          <Field
            label="Instagram (link completo)"
            value={form.instagram_url}
            onChange={(v) => set("instagram_url", v)}
            placeholder="https://instagram.com/tu_usuario"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <h2 className="font-display text-xl text-brown-900">Entrega</h2>
        <div className="mt-4 space-y-4">
          <Field
            label="Dirección de retiro"
            value={form.pickup_address}
            onChange={(v) => set("pickup_address", v)}
            placeholder="Ej: Av. Siempre Viva 123, CABA"
          />
          <Field
            label="Nota de delivery"
            value={form.delivery_note}
            onChange={(v) => set("delivery_note", v)}
            placeholder="Ej: Coordinamos el costo y la zona por WhatsApp."
          />
        </div>
      </section>

      <section className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <h2 className="font-display text-xl text-brown-900">
          Datos para transferencia
        </h2>
        <div className="mt-4 space-y-4">
          <Field label="Alias" value={form.bank_alias} onChange={(v) => set("bank_alias", v)} />
          <Field label="CBU" value={form.bank_cbu} onChange={(v) => set("bank_cbu", v)} />
          <Field
            label="Titular de la cuenta"
            value={form.bank_holder}
            onChange={(v) => set("bank_holder", v)}
          />
          <Field
            label="Nota adicional"
            value={form.bank_extra_note}
            onChange={(v) => set("bank_extra_note", v)}
            placeholder="Ej: Enviar comprobante por WhatsApp"
          />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brown-900 px-8 py-3 text-sm font-semibold text-cream transition hover:bg-brown-800 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm text-green-700">Guardado ✓</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brown-800">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
      />
    </div>
  );
}
