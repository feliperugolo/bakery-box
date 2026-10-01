"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { DiscountCode, Order, OrderItem, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { statusOptions } from "./order-row";

type DraftItem = {
  key: string;
  productId: string; // id del producto, o "__custom__"
  name: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
};

function emptyItem(): DraftItem {
  return {
    key: Math.random().toString(36).slice(2),
    productId: "",
    name: "",
    sizeLabel: "",
    unitPrice: 0,
    quantity: 1,
  };
}

function priceForProduct(product: Product): { price: number; sizeLabel: string } {
  if (product.sizes && product.sizes.length > 0) {
    const first = product.sizes[0];
    return { price: Number(first.price), sizeLabel: first.label };
  }
  const price =
    product.promo_active && product.promo_price != null
      ? Number(product.promo_price)
      : Number(product.price);
  return { price, sizeLabel: product.size_label || "" };
}

export default function AddOrderModal({
  products,
  discountCodes,
  onClose,
  onCreate,
}: {
  products: Product[];
  discountCodes: DiscountCode[];
  onClose: () => void;
  onCreate: (order: {
    customer_name: string;
    customer_phone: string;
    delivery_method: "retiro" | "delivery";
    address: string;
    payment_method: "transferencia" | "efectivo";
    items: OrderItem[];
    total: number;
    status: Order["status"];
    notes: string;
    delivery_date: string;
    discount_code: string | null;
    discount_amount: number;
    paid: boolean;
    paid_at: string | null;
  }) => Promise<string | void>;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"retiro" | "delivery">("retiro");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"transferencia" | "efectivo">("efectivo");
  const [status, setStatus] = useState<Order["status"]>("confirmado");
  const [paid, setPaid] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const matchedDiscount = useMemo(() => {
    if (!discountCodeInput.trim()) return null;
    return (
      discountCodes.find(
        (d) => d.active && d.code.toLowerCase() === discountCodeInput.trim().toLowerCase()
      ) || null
    );
  }, [discountCodeInput, discountCodes]);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountAmount = matchedDiscount
    ? matchedDiscount.type === "percent"
      ? Math.round((subtotal * Number(matchedDiscount.value)) / 100)
      : Math.min(subtotal, Number(matchedDiscount.value))
    : 0;
  const total = subtotal - discountAmount;

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function handleProductSelect(key: string, productId: string) {
    if (productId === "__custom__") {
      updateItem(key, { productId, name: "", sizeLabel: "", unitPrice: 0 });
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const { price, sizeLabel } = priceForProduct(product);
    updateItem(key, { productId, name: product.name, unitPrice: price, sizeLabel });
  }

  function handleSizeSelect(key: string, productId: string, sizeLabel: string) {
    const product = products.find((p) => p.id === productId);
    const size = product?.sizes.find((s) => s.label === sizeLabel);
    updateItem(key, { sizeLabel, unitPrice: size ? Number(size.price) : 0 });
  }

  async function handleSubmit() {
    setError("");
    if (!customerName.trim()) return setError("Falta el nombre del cliente.");
    if (!customerPhone.trim()) return setError("Falta el teléfono del cliente.");
    if (!deliveryDate) return setError("Falta la fecha de entrega.");
    if (deliveryMethod === "delivery" && !address.trim())
      return setError("Falta la dirección de entrega.");
    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) return setError("Agregá al menos un producto.");

    const orderItems: OrderItem[] = validItems.map((i) => ({
      product_id: i.productId === "__custom__" ? "" : i.productId,
      name: i.name.trim(),
      quantity: Math.max(1, Math.round(i.quantity)),
      unit_price: i.unitPrice,
      size_label: i.sizeLabel,
    }));

    setSaving(true);
    const errMsg = await onCreate({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      delivery_method: deliveryMethod,
      address: deliveryMethod === "delivery" ? address.trim() : "",
      payment_method: paymentMethod,
      items: orderItems,
      total,
      status,
      notes: notes.trim(),
      delivery_date: deliveryDate,
      discount_code: matchedDiscount ? matchedDiscount.code : null,
      discount_amount: discountAmount,
      paid,
      paid_at: paid ? new Date().toISOString() : null,
    });
    setSaving(false);
    if (errMsg) setError(errMsg);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brown-900/40 p-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-brown-900/10 p-5">
          <h2 className="font-display text-xl text-brown-900">Agregar pedido manual</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-brown-900/5">
            <X className="h-5 w-5 text-brown-800/60" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del cliente">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                placeholder="Ej: María Pérez"
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                placeholder="Ej: 1122334455"
              />
            </Field>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-brown-800/60">Productos</label>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-paper p-2.5">
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(item.key, e.target.value)}
                    className="min-w-[160px] flex-1 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                  >
                    <option value="">Elegir producto…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__custom__">Otro / personalizado</option>
                  </select>

                  {item.productId === "__custom__" ? (
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.key, { name: e.target.value })}
                      placeholder="Nombre del producto"
                      className="min-w-[140px] flex-1 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                    />
                  ) : (
                    (() => {
                      const product = products.find((p) => p.id === item.productId);
                      if (!product || !product.sizes || product.sizes.length === 0) return null;
                      return (
                        <select
                          value={item.sizeLabel}
                          onChange={(e) => handleSizeSelect(item.key, item.productId, e.target.value)}
                          className="min-w-[140px] rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                        >
                          {product.sizes.map((s) => (
                            <option key={s.label} value={s.label}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      );
                    })()
                  )}

                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
                    className="w-16 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                    title="Cantidad"
                  />

                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) })}
                    className="w-28 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                    title="Precio unitario"
                  />

                  <button
                    onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                    className="rounded-full p-1.5 text-brown-800/40 hover:bg-red-500/10 hover:text-red-600"
                    title="Quitar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brown-800/70 hover:text-brown-900"
            >
              <Plus className="h-4 w-4" /> Agregar producto
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entrega">
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as "retiro" | "delivery")}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              >
                <option value="retiro">Retiro en el local</option>
                <option value="delivery">Delivery</option>
              </select>
            </Field>
            <Field label="Fecha de entrega">
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              />
            </Field>
          </div>

          {deliveryMethod === "delivery" && (
            <Field label="Dirección">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                placeholder="Calle, número, barrio"
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forma de pago">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "transferencia" | "efectivo")}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </Field>
            <Field label="Código de descuento (opcional)">
              <input
                value={discountCodeInput}
                onChange={(e) => setDiscountCodeInput(e.target.value)}
                className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                placeholder="Ej: BIENVENIDA10"
              />
              {discountCodeInput.trim() && !matchedDiscount && (
                <p className="mt-1 text-xs text-red-600">Código no válido.</p>
              )}
            </Field>
          </div>

          <Field label="Notas (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              rows={2}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-brown-800/60">Estado</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value as Order["status"])}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      status === s.value
                        ? `${s.color} text-white`
                        : "bg-cream-dark text-brown-800/70 hover:opacity-80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brown-800/80">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              Ya está pagado
            </label>
          </div>

          <div className="rounded-xl bg-paper p-3 text-sm">
            <div className="flex justify-between text-brown-800/70">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-brown-800/70">
                <span>Descuento</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-semibold text-brown-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-brown-900/10 p-5">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-brown-800/70 hover:bg-brown-900/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-full bg-brown-900 px-5 py-2 text-sm font-medium text-cream transition hover:bg-brown-800 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-brown-800/60">{label}</label>
      {children}
    </div>
  );
}
