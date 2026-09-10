"use client";

import { useState } from "react";
import { ChevronDown, CircleDollarSign, CircleCheck } from "lucide-react";
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

  const togglePaid = async (order: Order) => {
    const supabase = createClient();
    const paid = !order.paid;
    const paid_at = paid ? new Date().toISOString() : null;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, paid, paid_at } : o)));
    await supabase.from("orders").update({ paid, paid_at }).eq("id", order.id);
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-paper p-10 text-center text-brown-800/60 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        Todavía no hay pedidos registrados.
      </div>
    );
  }

  // Agrupamos por día de entrega: "sin fecha" primero (necesitan que le
  // asignemos un día), después cada fecha en orden ascendente.
  const groups = new Map<string, Order[]>();
  for (const order of orders) {
    const key = order.delivery_date || "__sin_fecha__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "__sin_fecha__") return -1;
    if (b === "__sin_fecha__") return 1;
    return a.localeCompare(b);
  });

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD en horario local

  return (
    <div className="flex flex-col gap-8">
      {sortedKeys.map((key) => {
        const groupOrders = groups.get(key)!;
        const groupTotal = groupOrders
          .filter((o) => o.status !== "cancelado")
          .reduce((sum, o) => sum + o.total, 0);
        const isUndated = key === "__sin_fecha__";
        const isToday = key === todayStr;

        return (
          <section key={key}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg text-brown-900">
                {isUndated ? (
                  <span className="text-red-600">Sin día de entrega asignado</span>
                ) : (
                  <>
                    {formatDeliveryDate(key)}
                    {isToday && (
                      <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-medium text-white">
                        Hoy
                      </span>
                    )}
                  </>
                )}
              </h2>
              <p className="text-sm text-brown-800/50">
                {groupOrders.length} pedido{groupOrders.length === 1 ? "" : "s"} ·{" "}
                {formatPrice(groupTotal)}
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {groupOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  open={openId === order.id}
                  onToggleOpen={() => setOpenId(openId === order.id ? null : order.id)}
                  onUpdateStatus={(status) => updateStatus(order, status)}
                  onTogglePaid={() => togglePaid(order)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function OrderRow({
  order,
  open,
  onToggleOpen,
  onUpdateStatus,
  onTogglePaid,
}: {
  order: Order;
  open: boolean;
  onToggleOpen: () => void;
  onUpdateStatus: (status: Order["status"]) => void;
  onTogglePaid: () => void;
}) {
  const status = statusOptions.find((s) => s.value === order.status) || statusOptions[0];
  return (
    <li className="rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
      <button
        onClick={onToggleOpen}
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
          <span
            className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:flex ${
              order.paid
                ? "bg-green-600/10 text-green-700"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {order.paid ? (
              <CircleCheck className="h-3.5 w-3.5" />
            ) : (
              <CircleDollarSign className="h-3.5 w-3.5" />
            )}
            {order.paid ? "Pagado" : "Sin cobrar"}
          </span>
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {statusOptions.map((s) => (
              <button
                key={s.value}
                onClick={() => onUpdateStatus(s.value as Order["status"])}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  order.status === s.value
                    ? `${s.color} text-white`
                    : "bg-cream-dark text-brown-800/70 hover:opacity-80"
                }`}
              >
                {s.label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-brown-900/10" />
            <button
              onClick={onTogglePaid}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                order.paid
                  ? "bg-green-600 text-white hover:opacity-90"
                  : "bg-cream-dark text-brown-800/70 hover:opacity-80"
              }`}
            >
              {order.paid ? (
                <CircleCheck className="h-3.5 w-3.5" />
              ) : (
                <CircleDollarSign className="h-3.5 w-3.5" />
              )}
              {order.paid
                ? `Pagado${order.paid_at ? " · " + new Date(order.paid_at).toLocaleDateString("es-AR") : ""}`
                : "Marcar como pagado"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
