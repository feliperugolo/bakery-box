"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/delivery";
import { OrderRow } from "./order-row";
import { downloadDayOrdersPdf } from "@/lib/pdf/day-orders-pdf";

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
        No hay pedidos por delante todavía. En cuanto entre uno nuevo va a
        aparecer acá.
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
        const dayLabel = isUndated
          ? "Sin día de entrega asignado"
          : formatDeliveryDate(key) + (isToday ? " (hoy)" : "");

        return (
          <section key={key}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
              <div className="flex items-center gap-3">
                <p className="text-sm text-brown-800/50">
                  {groupOrders.length} pedido{groupOrders.length === 1 ? "" : "s"} ·{" "}
                  {formatPrice(groupTotal)}
                </p>
                {!isUndated && (
                  <button
                    onClick={() => downloadDayOrdersPdf(dayLabel, groupOrders)}
                    className="flex items-center gap-1.5 rounded-full bg-cream-dark px-3 py-1.5 text-xs font-medium text-brown-800 transition hover:bg-brown-900/10"
                    title="Descargar PDF con el resumen de este día"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                )}
              </div>
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
