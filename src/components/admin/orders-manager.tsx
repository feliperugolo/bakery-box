"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/delivery";

const statusOptions = [
  { value: "nuevo", label: "Nuevo", color: "bg-gold-500" },
  { value: "confirmado", label: "Confirmado", color: "bg-blue-500" },
  { value: "entregado", label: "Entregado", color: "bg-green-600" },
  { value: "cancelado", label: "Cancelado", color: "bg-red-500" },
];

export default function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [openId, setOpenId] = useState<string | null>(null);

  const updateStatus = async (order: Order, status: Order["status"]) => {
    const supabase = createClient();
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", order.id);
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-paper p-10 text-center text-brown-800/60 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        Todavía no hay pedidos registrados.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const status = statusOptions.find((s) => s.value === order.status) || statusOptions[0];
        const open = openId === order.id;
        return (
          <li
            key={order.id}
            className="rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
          >
            <button
              onClick={() => setOpenId(open ? null : order.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                <div>
                  <p className="font-medium text-brown-900">{order.customer_name}</p>
                  <p className="text-xs text-brown-800/50">
                    {new Date(order.created_at).toLocaleString("es-AR")} ·{" "}
                    {order.delivery_method === "delivery" ? "Delivery" : "Retiro"} ·{" "}
                    {order.payment_method === "transferencia" ? "Transferencia" : "Efectivo"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-brown-900">
                  {formatPrice(order.total)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-brown-800/50 transition ${open ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {open && (
              <div className="border-t border-brown-900/10 p-4">
                <ul className="mb-3 space-y-1 text-sm text-brown-800/80">
                  {order.items.map((item, i) => (
                    <li key={i}>
                      {item.quantity}x {item.name} — {formatPrice(item.unit_price * item.quantity)}
                    </li>
                  ))}
                </ul>
                {order.address && (
                  <p className="mb-1 text-sm text-brown-800/70">
                    <span className="font-medium">Dirección:</span> {order.address}
                  </p>
                )}
                <p className="mb-1 text-sm text-brown-800/70">
                  <span className="font-medium">Teléfono:</span> {order.customer_phone}
                </p>
                {order.delivery_date && (
                  <p className="mb-1 text-sm text-brown-800/70">
                    <span className="font-medium">Día de entrega:</span>{" "}
                    {formatDeliveryDate(order.delivery_date)}
                  </p>
                )}
                {order.discount_code && (
                  <p className="mb-1 text-sm text-brown-800/70">
                    <span className="font-medium">Descuento:</span>{" "}
                    {order.discount_code} (-{formatPrice(order.discount_amount)})
                  </p>
                )}
                {order.notes && (
                  <p className="mb-3 text-sm text-brown-800/70">
                    <span className="font-medium">Notas:</span> {order.notes}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {statusOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateStatus(order, s.value as Order["status"])}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        order.status === s.value
                          ? `${s.color} text-white`
                          : "bg-cream-dark text-brown-800/70 hover:opacity-80"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
