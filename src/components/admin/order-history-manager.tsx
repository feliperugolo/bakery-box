"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/delivery";
import { OrderRow } from "./order-row";

export default function OrderHistoryManager({
  initialOrders,
  from,
  to,
}: {
  initialOrders: Order[];
  from: string;
  to: string;
}) {
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

  const groups = new Map<string, Order[]>();
  for (const order of orders) {
    const key = order.delivery_date || "__sin_fecha__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  const pendingCount = orders.filter((o) => !o.paid && o.status !== "cancelado").length;

  return (
    <div className="flex flex-col gap-6">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-paper p-4 shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-brown-800/60">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-brown-900/15 bg-cream px-3 py-2 text-sm outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brown-800/60">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-brown-900/15 bg-cream px-3 py-2 text-sm outline-none focus:border-gold-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brown-900 px-4 py-2 text-sm font-medium text-cream transition hover:bg-brown-800"
        >
          Buscar
        </button>
        {pendingCount > 0 && (
          <span className="ml-auto rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600">
            {pendingCount} pedido{pendingCount === 1 ? "" : "s"} sin cobrar en este rango
          </span>
        )}
      </form>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-paper p-10 text-center text-brown-800/60 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
          No hay pedidos entregados en ese rango de fechas.
        </div>
      ) : (
        sortedKeys.map((key) => {
          const groupOrders = groups.get(key)!;
          const groupTotal = groupOrders
            .filter((o) => o.status !== "cancelado")
            .reduce((sum, o) => sum + o.total, 0);
          const isUndated = key === "__sin_fecha__";

          return (
            <section key={key}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg text-brown-900">
                  {isUndated ? "Sin día de entrega asignado" : formatDeliveryDate(key)}
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
        })
      )}
    </div>
  );
}
