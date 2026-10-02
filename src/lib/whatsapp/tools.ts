import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { formatPrice } from "@/lib/format";
import { phoneNumbersMatch } from "@/lib/phone";

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

export const NOTIFY_TEAM_TOOL: Anthropic.Tool = {
  name: "notify_team",
  description:
    "Marca esta conversación para que un humano del equipo de Bakery Box la revise y responda. Usalo SIEMPRE que le digas al cliente que el equipo lo va a contactar (reclamos, pedidos de diseño muy especiales, dudas mayoristas que requieren seguimiento, o cualquier cosa que no puedas resolver vos). No hace falta esperar respuesta del cliente para llamarlo.",
  input_schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Resumen breve de por qué esta charla necesita a un humano.",
      },
    },
    required: ["reason"],
  },
};

type NotifyTeamInput = { reason?: string };

export async function runNotifyTeam(
  supabase: AnySupabaseClient,
  customerPhone: string,
  input: NotifyTeamInput
): Promise<string> {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ needs_attention: true })
    .eq("phone_number", customerPhone);

  if (error) {
    return `No se pudo marcar la charla para el equipo (${error.message}), pero igual respondele al cliente con normalidad.`;
  }

  return `Listo, quedó marcada para que el equipo la revise${input.reason ? `: ${input.reason}` : ""}.`;
}

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

  const orderPayload = {
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
    awaiting_whatsapp_confirmation: false,
  };

  // Si el cliente armó este pedido en la página y lo está confirmando ahora
  // por WhatsApp, ya existe una fila guardada desde el checkout (marcada
  // awaiting_whatsapp_confirmation) — hay que actualizar esa en vez de crear
  // una nueva, si no el pedido queda duplicado en el panel. La comparamos
  // por teléfono (tolerando formato distinto entre lo que tipeó en la
  // página y el número real de WhatsApp) y que sea reciente.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id, customer_phone")
    .eq("awaiting_whatsapp_confirmation", true)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const matchingPending = (pendingOrders || []).find((o: { customer_phone: string }) =>
    phoneNumbersMatch(o.customer_phone, customerPhone)
  );

  const { data: order, error } = matchingPending
    ? await supabase
        .from("orders")
        .update(orderPayload)
        .eq("id", matchingPending.id)
        .select("id")
        .single()
    : await supabase.from("orders").insert(orderPayload).select("id").single();

  if (error || !order) {
    return `Error al guardar el pedido: ${error?.message}. Avisale al cliente que hubo un problema técnico y que un humano lo va a contactar.`;
  }

  // El cliente acaba de dar su nombre real para el pedido — lo usamos para
  // identificar la charla en el panel en vez del apodo de WhatsApp (que a
  // veces no dice nada: emojis, motes, etc).
  await supabase
    .from("whatsapp_conversations")
    .update({ customer_name: input.customer_name })
    .eq("phone_number", customerPhone);

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
export const CANCEL_ORDER_TOOL: Anthropic.Tool = {
  name: "cancel_order",
  description:
    "Cancela el pedido más reciente del cliente y lo borra del sistema. Usala SOLO después de que el cliente confirmó explícitamente que quiere cancelar (ej: le preguntaste '¿confirmás que querés cancelar tu pedido?' y te dijo que sí). Es una acción permanente, no se puede deshacer.",
  input_schema: {
    type: "object",
    properties: {},
  },
};

export async function runCancelOrder(
  supabase: AnySupabaseClient,
  customerPhone: string
): Promise<string> {
  const { data: candidates } = await supabase
    .from("orders")
    .select("id, customer_phone, status, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const order = (candidates || []).find(
    (o: { customer_phone: string; status: string }) =>
      o.status !== "cancelado" &&
      o.status !== "entregado" &&
      phoneNumbersMatch(o.customer_phone, customerPhone)
  );

  if (!order) {
    return "No encontré ningún pedido activo a nombre de este número para cancelar. Avisale al cliente que no tenemos un pedido pendiente con este teléfono, y si cree que es un error, llamá a notify_team.";
  }

  const { error } = await supabase.from("orders").delete().eq("id", order.id);

  if (error) {
    return `No se pudo cancelar el pedido (${error.message}). Avisale al cliente que el equipo lo va a resolver a mano y llamá a notify_team.`;
  }

  return "Listo, el pedido se canceló y se borró del sistema. Avisale al cliente que quedó cancelado sin problema.";
}
