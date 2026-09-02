import { CartItem } from "./cart-store";
import { formatPrice } from "./format";
import { formatDeliveryDate } from "./delivery";
import { DeliveryMethod, PaymentMethod } from "./types";

type BuildMessageArgs = {
  items: CartItem[];
  subtotal: number;
  total: number;
  customerName: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  deliveryDate: string;
  paymentMethod: PaymentMethod;
  discountCode?: string;
  discountAmount?: number;
  notes?: string;
};

export function buildWhatsappMessage({
  items,
  subtotal,
  total,
  customerName,
  deliveryMethod,
  address,
  deliveryDate,
  paymentMethod,
  discountCode,
  discountAmount,
  notes,
}: BuildMessageArgs) {
  const lines: string[] = [];

  lines.push("¡Hola! Quiero hacer este pedido en Bakery Box 🧁");
  lines.push("");
  lines.push("*Productos:*");
  for (const item of items) {
    lines.push(
      `• ${item.quantity}x ${item.name}${
        item.sizeLabel ? ` (${item.sizeLabel})` : ""
      } — ${formatPrice(item.price * item.quantity)}`
    );
  }
  lines.push("");
  if (discountAmount && discountAmount > 0) {
    lines.push(`Subtotal: ${formatPrice(subtotal)}`);
    lines.push(`Descuento (${discountCode}): -${formatPrice(discountAmount)}`);
  }
  lines.push(`*Total: ${formatPrice(total)}*`);
  lines.push("");
  lines.push(`*Nombre:* ${customerName}`);
  lines.push(
    `*Entrega:* ${deliveryMethod === "delivery" ? "Envío a domicilio" : "Retiro en el local"}`
  );
  if (deliveryMethod === "delivery" && address) {
    lines.push(`*Dirección:* ${address}`);
  }
  if (deliveryDate) {
    lines.push(`*Día de entrega:* ${formatDeliveryDate(deliveryDate)}`);
  }
  lines.push(
    `*Forma de pago:* ${
      paymentMethod === "transferencia" ? "Transferencia bancaria" : "Efectivo"
    }`
  );
  if (notes) {
    lines.push(`*Notas:* ${notes}`);
  }

  return lines.join("\n");
}

export function whatsappLink(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
