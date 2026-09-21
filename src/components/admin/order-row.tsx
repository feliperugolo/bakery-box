"use client";

import { ChevronDown, CircleDollarSign, CircleCheck } from "lucide-react";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export const statusOptions = [
  { value: "nuevo", label: "Nuevo", color: "bg-gold-500" },
  { value: "confirmado", label: "Confirmado", color: "bg-blue-500" },
  { value: "entregado", label: "Entregado", color: "bg-green-600" },
  { value: "cancelado", label: "Cancelado", color: "bg-red-500" },
] as const;

export function OrderRow({
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
