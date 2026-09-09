import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { formatPrice } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export const CREATE_ORDER_TOOL: Anthropic.Tool = {
  name: "create_order",
  description:
    "Registra un pedido confirmado en el sistema de Bakery Box. Usalo SOLO después de que el cliente confirmó explícitamente el resumen del pedido (productos, precios, entrega, pago y total). Los precios reales se recalculan del catálogo, no hace falta que sean exactos.",
  input_schema: {
    type: "object",
    properties: {
      customer_name: {
        type: "string",
        description: "Nombre y apellido del cliente.",
      },
      items: {
        type: "array",
        description: "Productos del pedido, usando el slug exacto del catálogo.",
        items: {
          type: "object",
          properties: {
            product_slug: { type: "string" },
            size_label: {
              type: "string",
              description:
                "Solo si el producto tiene tamaños (ej: 'Chico' o 'Grande'). Dejar vacío si no aplica.",
            },
            quantity: { type: "number" },
          },
          required: ["product_slug", "quantity"],
        },
      },
      delivery_method: {
        type: "string",
        enum: ["retiro", "delivery"],
      },
      address: {
        type: "string",
        description: "Dirección de entrega. Vacío si es retiro en el local.",
      },
      delivery_date: {
        type: "string",
        description: "Fecha de entrega elegida, formato YYYY-MM-DD.",
      },
      payment_method: {
        type: "string",
        enum: ["transferencia", "efectivo"],
      },
      discount_code: {
        type: "string",
        description: "Código de descuento aplicado, si el cliente dio uno válido.",
      },
      notes: {
        type: "string",
        description: "Cualquier aclaración adicional del pedido.",
      },
    },
    required: [
      "customer_name",
      "items",
      "delivery_method",
      "delivery_date",
      "payment_method",
    ],
  },
};

type CreateOrderInput = {
  customer_name: string;
  items: { product_slug: string; size_label?: string; quantity: number }[];
  delivery_method: "retiro" | "delivery";
  address?: string;
  delivery_date: string;
  payment_method: "transferencia" | "efectivo";
  discount_code?: string;
  notes?: string;
};

export async function runCreateOrder(
  supabase: AnySupabaseClient,
  customerPhone: string,
  input: CreateOrderInput
): Promise<string> {
  if (!input.items || input.items.length === 0) {
    return "Error: el pedido no tiene productos. Pedile al cliente que aclare qué quiere pedir.";
  }

  const slugs = input.items.map((i) => i.product_slug);
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .in("slug", slugs)
    .eq("active", true);

  const resolvedItems: {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    size_label: string;
  }[] = [];
  const missing: string[] = [];

  for (const item of input.items) {
    const product = (products || []).find((p) => p.slug === item.product_slug);
    if (!product) {
      missing.push(item.product_slug);
      continue;
    }

    let unitPrice = product.promo_active && product.promo_price != null
      ? Number(product.promo_price)
      : Number(product.price);
    let sizeLabel = product.size_label || "";

    if (product.sizes && product.sizes.length > 0) {
      const size = product.sizes.find(
        (s: { label: string; price: number }) =>
          s.label.toLowerCase() === (item.size_label || "").toLowerCase()
      );
      if (size) {
        unitPrice = Number(size.price);
        sizeLabel = size.label;
      } else {
        // Sin tamaño válido: usar el más barato para no bloquear el pedido.
        const cheapest = product.sizes.reduce(
          (a: { label: string; price: number }, b: { label: string; price: number }) =>
            b.price < a.price ? b : a
        );
        unitPrice = Number(cheapest.price);
        sizeLabel = cheapest.label;
      }
    }

    resolvedItems.push({
      product_id: product.id,
      name: product.name,
      quantity: Math.max(1, Math.round(item.quantity)),
      unit_price: unitPrice,
      size_label: sizeLabel,
    });
  }

  if (missing.length > 0) {
    return `Error: no encontré estos productos en el catálogo (slug inválido): ${missing.join(", ")}. Revisá el catálogo y volvé a intentar con el slug correcto.`;
  }

  const subtotal = resolvedItems.reduce(
    (sum, i) => sum + i.unit_price * i.quantity,
    0
  );

  let discountAmount = 0;
  let discountCode: string | null = null;

  if (input.discount_code) {
    const { data: discount } = await supabase
      .from("discount_codes")
      .select("*")
      .ilike("code", input.discount_code)
      .eq("active", true)
      .maybeSingle();

    if (discount) {
      discountCode = discount.code;
      discountAmount =
        discount.type === "percent"
          ? Math.round((subtotal * Number(discount.value)) / 100)
          : Math.min(subtotal, Number(discount.value));
    }
  }

  const total = subtotal - discountAmount;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customer_name,
      customer_phone: customerPhone,
      delivery_method: input.delivery_method,
      address: input.address || "",
      payment_method: input.payment_method,
      items: resolvedItems,
      total,
      discount_code: discountCode,
      discount_amount: discountAmount,
      notes: input.notes || "",
      delivery_date: input.delivery_date,
    })
    .select("id")
    .single();

  if (error || !order) {
    return `Error al guardar el pedido: ${error?.message}. Avisale al cliente que hubo un problema técnico y que un humano lo va a contactar.`;
  }

  const lines = resolvedItems.map(
    (i) =>
      `${i.quantity}x ${i.name}${i.size_label ? ` (${i.size_label})` : ""} — ${formatPrice(i.unit_price * i.quantity)}`
  );

  return [
    `Pedido guardado con éxito (ref #${order.id.slice(0, 8)}).`,
    `Detalle: ${lines.join("; ")}.`,
    discountAmount > 0
      ? `Subtotal ${formatPrice(subtotal)}, descuento ${formatPrice(discountAmount)}, total ${formatPrice(total)}.`
      : `Total ${formatPrice(total)}.`,
    `Ahora confirmale al cliente que el pedido quedó registrado, con el total final y los próximos pasos según la forma de pago.`,
  ].join(" ");
}
