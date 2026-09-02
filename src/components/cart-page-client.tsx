"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Copy, Check, Tag, X } from "lucide-react";
import { useCartStore, cartTotal } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { buildWhatsappMessage, whatsappLink } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured as supabaseConfigured } from "@/lib/supabase-config";
import { useHasMounted } from "@/lib/use-has-mounted";
import { getDeliveryDayOptions } from "@/lib/delivery";
import { DeliveryMethod, DiscountCode, PaymentMethod, SiteSettings } from "@/lib/types";

export default function CartPageClient({ settings }: { settings: SiteSettings }) {
  const mounted = useHasMounted();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("retiro");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const deliveryDayOptions = getDeliveryDayOptions();

  const subtotal = cartTotal(items);
  const discountAmount = appliedDiscount
    ? Math.min(
        subtotal,
        appliedDiscount.type === "percent"
          ? Math.round((subtotal * appliedDiscount.value) / 100)
          : appliedDiscount.value
      )
    : 0;
  const total = subtotal - discountAmount;

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const applyDiscount = async () => {
    setDiscountError(null);
    const code = discountInput.trim();
    if (!code) return;

    if (!supabaseConfigured) {
      setDiscountError("Los códigos de descuento no están disponibles ahora.");
      return;
    }

    setDiscountChecking(true);
    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("discount_codes")
        .select("*")
        .ilike("code", code)
        .eq("active", true)
        .maybeSingle();

      if (dbError || !data) {
        setDiscountError("Ese código no existe o ya no está activo.");
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount(data as DiscountCode);
      }
    } catch {
      setDiscountError("No pudimos validar el código. Probá de nuevo.");
    } finally {
      setDiscountChecking(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (items.length === 0) return;
    if (!name.trim()) {
      setError("Contanos tu nombre para el pedido.");
      return;
    }
    if (!phone.trim()) {
      setError("Dejanos un teléfono de contacto.");
      return;
    }
    if (deliveryMethod === "delivery" && !address.trim()) {
      setError("Necesitamos la dirección para el envío.");
      return;
    }
    if (!deliveryDate) {
      setError("Elegí un día de entrega.");
      return;
    }

    setSubmitting(true);

    const message = buildWhatsappMessage({
      items,
      subtotal,
      total,
      customerName: name.trim(),
      deliveryMethod,
      address: address.trim(),
      deliveryDate,
      paymentMethod,
      discountCode: appliedDiscount?.code,
      discountAmount,
      notes: notes.trim(),
    });

    if (supabaseConfigured) {
      try {
        const supabase = createClient();
        await supabase.from("orders").insert({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          delivery_method: deliveryMethod,
          address: address.trim(),
          delivery_date: deliveryDate,
          payment_method: paymentMethod,
          items: items.map((i) => ({
            product_id: i.productId,
            name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            size_label: i.sizeLabel,
          })),
          total,
          discount_code: appliedDiscount?.code || null,
          discount_amount: discountAmount,
          notes: notes.trim(),
        });
      } catch {
        // Si falla el guardado igual dejamos que el pedido se mande por WhatsApp.
      }
    }

    const link = whatsappLink(settings.whatsapp_number, message);
    window.open(link, "_blank");
    clear();
    setSubmitting(false);
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
        <ShoppingBag className="h-14 w-14 text-brown-800/25" strokeWidth={1.25} />
        <h1 className="font-display text-2xl text-brown-900">
          Tu carrito está vacío
        </h1>
        <p className="text-brown-800/70">
          Agregá alguna torta o postre desde el catálogo para armar tu pedido.
        </p>
        <Link
          href="/productos"
          className="mt-2 rounded-full bg-brown-900 px-7 py-3 text-sm font-semibold text-cream transition hover:bg-brown-800"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <h1 className="font-display text-3xl text-brown-900 sm:text-4xl">
        Tu pedido
      </h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* Items */}
        <div>
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={`${item.productId}::${item.sizeLabel}`}
                className="flex gap-4 rounded-2xl bg-paper p-4 shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg leading-tight text-brown-900">
                        {item.name}
                      </p>
                      {item.sizeLabel && (
                        <p className="text-xs text-brown-800/60">
                          {item.sizeLabel}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.sizeLabel)}
                      aria-label="Quitar"
                      className="shrink-0 text-brown-800/40 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center gap-2 rounded-full border border-brown-900/15 px-1">
                      <button
                        className="flex h-8 w-8 items-center justify-center text-brown-800"
                        onClick={() =>
                          setQuantity(item.productId, item.sizeLabel, item.quantity - 1)
                        }
                        aria-label="Restar"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button
                        className="flex h-8 w-8 items-center justify-center text-brown-800"
                        onClick={() =>
                          setQuantity(item.productId, item.sizeLabel, item.quantity + 1)
                        }
                        aria-label="Sumar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-lg font-semibold text-brown-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/productos"
            className="mt-6 inline-block text-sm font-medium text-brown-800 underline decoration-gold-400 underline-offset-4 hover:text-gold-500"
          >
            + Agregar más productos
          </Link>
        </div>

        {/* Checkout */}
        <div className="h-fit rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
          {/* Código de descuento */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brown-800">
              <Tag className="h-3.5 w-3.5" /> Código de descuento
            </p>
            {appliedDiscount ? (
              <div className="flex items-center justify-between rounded-xl bg-gold-500/10 px-4 py-2.5 text-sm">
                <span className="font-medium text-brown-900">
                  {appliedDiscount.code} aplicado (
                  {appliedDiscount.type === "percent"
                    ? `${appliedDiscount.value}%`
                    : formatPrice(appliedDiscount.value)}
                  )
                </span>
                <button
                  onClick={removeDiscount}
                  aria-label="Quitar código"
                  className="text-brown-800/50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && applyDiscount()}
                  placeholder="Ingresá tu código"
                  className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
                />
                <button
                  onClick={applyDiscount}
                  disabled={discountChecking || !discountInput.trim()}
                  className="shrink-0 rounded-xl bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-brown-800 disabled:opacity-60"
                >
                  {discountChecking ? "..." : "Aplicar"}
                </button>
              </div>
            )}
            {discountError && (
              <p className="mt-1.5 text-xs text-red-600">{discountError}</p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-1 border-b border-brown-900/10 pb-4">
            {discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm text-brown-800/70">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gold-500">
                  <span>Descuento</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-brown-800">Total</span>
              <span className="text-2xl font-semibold text-brown-900">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown-800">
                Nombre y apellido
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-brown-800">
                Teléfono de contacto
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
                placeholder="11 1234 5678"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-brown-800">Entrega</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDeliveryMethod("retiro")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    deliveryMethod === "retiro"
                      ? "border-gold-500 bg-gold-500/10 text-brown-900"
                      : "border-brown-900/15 text-brown-800/70"
                  }`}
                >
                  Retiro en el local
                </button>
                <button
                  onClick={() => setDeliveryMethod("delivery")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    deliveryMethod === "delivery"
                      ? "border-gold-500 bg-gold-500/10 text-brown-900"
                      : "border-brown-900/15 text-brown-800/70"
                  }`}
                >
                  Delivery
                </button>
              </div>
              {deliveryMethod === "delivery" ? (
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
                  placeholder="Dirección de entrega"
                />
              ) : (
                settings.pickup_address && (
                  <p className="mt-2 text-xs text-brown-800/60">
                    Retirás en: {settings.pickup_address}
                  </p>
                )
              )}
              {deliveryMethod === "delivery" && settings.delivery_note && (
                <p className="mt-2 text-xs text-brown-800/60">
                  {settings.delivery_note}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-brown-800">
                Día de entrega
              </label>
              <select
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
              >
                <option value="">Elegí un día</option>
                {deliveryDayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-brown-800/50">
                Entregas disponibles de lunes a sábados.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-brown-800">
                Forma de pago
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("efectivo")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    paymentMethod === "efectivo"
                      ? "border-gold-500 bg-gold-500/10 text-brown-900"
                      : "border-brown-900/15 text-brown-800/70"
                  }`}
                >
                  Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod("transferencia")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    paymentMethod === "transferencia"
                      ? "border-gold-500 bg-gold-500/10 text-brown-900"
                      : "border-brown-900/15 text-brown-800/70"
                  }`}
                >
                  Transferencia
                </button>
              </div>

              {paymentMethod === "transferencia" && (
                <div className="mt-3 space-y-2 rounded-xl bg-cream-dark p-3.5 text-sm">
                  {settings.bank_alias ? (
                    <>
                      <DataRow
                        label="Alias"
                        value={settings.bank_alias}
                        onCopy={() => copyToClipboard(settings.bank_alias, "alias")}
                        copied={copied === "alias"}
                      />
                      {settings.bank_cbu && (
                        <DataRow
                          label="CBU"
                          value={settings.bank_cbu}
                          onCopy={() => copyToClipboard(settings.bank_cbu, "cbu")}
                          copied={copied === "cbu"}
                        />
                      )}
                      {settings.bank_holder && (
                        <DataRow label="Titular" value={settings.bank_holder} />
                      )}
                      <p className="pt-1 text-xs text-brown-800/60">
                        {settings.bank_extra_note ||
                          "Enviá el comprobante por WhatsApp para confirmar tu pedido."}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-brown-800/60">
                      Te pasamos los datos para transferir apenas confirmemos tu
                      pedido por WhatsApp.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-brown-800">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
                placeholder="Ej: dedicatoria, sin frutos secos, etc."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar pedido por WhatsApp"}
            </button>
            <p className="text-center text-xs text-brown-800/50">
              Vas a confirmar el pedido por WhatsApp con {settings.store_name}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <span className="text-xs text-brown-800/60">{label}: </span>
        <span className="font-medium text-brown-900">{value}</span>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brown-800/60 hover:bg-cream hover:text-gold-500"
          aria-label={`Copiar ${label}`}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
