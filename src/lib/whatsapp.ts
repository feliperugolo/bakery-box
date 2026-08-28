import { CartItem } from "./cart-store";
import { formatPrice } from "./format";
import { DeliveryMethod, PaymentMethod } from "./types";

type BuildMessageArgs = {
  items: CartItem[];
  total: number;
  customerName: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  paymentMethod: PaymentMethod;
  notes?: string;
};

export function buildWhatsappMessage({
  items,
  total,
  customerName,
  deliveryMethod,
  address,
  paymentMethod,
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
  lines.push(`*Total: ${formatPrice(total)}*`);
  lines.push("");
  lines.push(`*Nombre:* ${customerName}`);
  lines.push(
    `*Entrega:* ${deliveryMethod === "delivery" ? "Envío a domicilio" : "Retiro en el local"}`
  );
  if (deliveryMethod === "delivery" && address) {
    lines.push(`*Dirección:* ${address}`);
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
