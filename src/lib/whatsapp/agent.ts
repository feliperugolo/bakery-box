import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { formatPrice } from "@/lib/format";
import { getDeliveryDayOptions } from "@/lib/delivery";
import { WhatsappMessage } from "@/lib/types";
import { CREATE_ORDER_TOOL, runCreateOrder } from "./tools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export const isBotConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

async function buildSystemPrompt(supabase: AnySupabaseClient): Promise<string> {
  const [{ data: categories }, { data: products }, { data: settings }, { data: discounts }] =
    await Promise.all([
      supabase.from("categories").select("*").eq("active", true).order("position"),
      supabase.from("products").select("*").eq("active", true).order("position"),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("discount_codes").select("*").eq("active", true),
    ]);

  const catalogText = (categories || [])
    .map((cat: { id: string; name: string }) => {
      const catProducts = (products || []).filter(
        (p: { category_id: string }) => p.category_id === cat.id
      );
      if (catProducts.length === 0) return null;

      const lines = catProducts.map(
        (
          p: {
            slug: string;
            name: string;
            description: string;
            size_label: string;
            price: number;
            promo_price: number | null;
            promo_active: boolean;
            sizes: { label: string; price: number }[];
          }
        ) => {
          let priceText: string;
          if (p.sizes && p.sizes.length > 0) {
            priceText = p.sizes
              .map((s) => `${s.label}: ${formatPrice(s.price)}`)
              .join(", ");
          } else if (p.promo_active && p.promo_price != null) {
            priceText = `${formatPrice(p.promo_price)} (antes ${formatPrice(p.price)}, en oferta)`;
          } else {
            priceText = formatPrice(p.price);
          }
          return `  - slug: "${p.slug}" | ${p.name}${p.size_label ? ` (${p.size_label})` : ""} — ${priceText}. ${p.description}`.trim();
        }
      );

      return `${cat.name}:\n${lines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const discountText =
    discounts && discounts.length > 0
      ? discounts
          .map(
            (d: { code: string; type: string; value: number }) =>
              `${d.code} (${d.type === "percent" ? `${d.value}% off` : `${formatPrice(d.value)} off`})`
          )
          .join(", ")
      : "Ninguno activo por el momento.";

  const deliveryDays = getDeliveryDayOptions(10)
    .map((d) => `${d.value} (${d.label})`)
    .join(", ");

  const pickupAddress = settings?.pickup_address || "a coordinar";
  const bankInfo =
    settings?.bank_alias || settings?.bank_cbu
      ? `Alias: ${settings.bank_alias || "-"} · CBU: ${settings.bank_cbu || "-"} · Titular: ${settings.bank_holder || "-"}`
      : "Todavía no hay datos bancarios cargados; si el cliente elige transferencia avisale que en breve le confirman los datos.";

  return `Sos el asistente de WhatsApp de Bakery Box, una pastelería premium a pedido (by Lunch Box) en Bella Vista, Argentina. Hablás en español rioplatense, tono cálido y profesional, mensajes cortos como de WhatsApp (podés usar *negrita* con asteriscos, así se ve en WhatsApp). No uses emojis en exceso, como máximo alguno ocasional.

Tu trabajo es responder consultas y tomar pedidos por vos mismo, sin necesidad de que un humano intervenga, salvo casos raros.

CATÁLOGO ACTUAL (los únicos productos y precios válidos — nunca inventes productos ni precios que no estén acá):
${catalogText}

Códigos de descuento activos: ${discountText}

Entregas: de lunes a sábado, nunca domingo. Próximas fechas disponibles (elegí junto con el cliente una de estas, formato YYYY-MM-DD): ${deliveryDays}

Punto de retiro: ${pickupAddress}
Datos para transferencia: ${bankInfo}
Formas de pago: transferencia bancaria o efectivo (se paga al momento de retirar o recibir).

Mayorista: si un cafetería, restaurante o emprendimiento pregunta por pedidos grandes/reventa, contale que Bakery Box hace pastelería premium para negocios con opciones para su carta y postres a medida, y que podés armar con ellos una propuesta personalizada ahí mismo por este chat.

CÓMO TOMAR UN PEDIDO:
1. Ayudá al cliente a elegir productos del catálogo (con su slug exacto).
2. Preguntá lo que falte: nombre, retiro o delivery (y dirección si es delivery), fecha de entrega (de las disponibles), forma de pago, y código de descuento si tiene.
3. Mostrale un resumen claro con el detalle y el total, y pedile que lo confirme explícitamente (ej: "¿confirmás así el pedido?").
4. Recién CUANDO el cliente confirma que sí, llamá a la herramienta create_order con los datos exactos. Nunca la llames antes de tener la confirmación explícita.
5. Después de crear el pedido, confirmale al cliente que quedó registrado y qué sigue (transferir y avisar, o coordinar el pago al recibir/retirar).

Si preguntan algo fuera de esto (reclamos, pedidos muy especiales de diseño, algo que no sepas resolver), respondé con amabilidad y decí que en breve el equipo de Bakery Box lo va a contactar para eso puntual — no inventes información que no tenés.`;
}

type ChatTurn = { role: "user" | "assistant"; content: string };

function historyToTurns(history: WhatsappMessage[]): ChatTurn[] {
  return history
    .filter((m) => m.body && m.body.trim().length > 0)
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : ("assistant" as const),
      content: m.body,
    }));
}

/**
 * Corre un turno del bot: le da al modelo el catálogo actualizado, el
 * historial reciente y el mensaje nuevo del cliente, deja que use la
 * herramienta create_order si hace falta, y devuelve el texto final para
 * mandarle al cliente por WhatsApp.
 */
export async function runBotTurn(args: {
  supabase: AnySupabaseClient;
  customerPhone: string;
  history: WhatsappMessage[];
  incomingText: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar ANTHROPIC_API_KEY para el bot de WhatsApp.");
  }

  const anthropic = new Anthropic({ apiKey });
  const system = await buildSystemPrompt(args.supabase);

  const messages: Anthropic.MessageParam[] = [
    ...historyToTurns(args.history),
    { role: "user", content: args.incomingText },
  ];

  let finalText = "";

  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await anthropic.messages.create({
      model: process.env.WHATSAPP_BOT_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system,
      tools: [CREATE_ORDER_TOOL],
      messages,
    });

    const textBlocks = response.content.filter((b) => b.type === "text");
    finalText = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n").trim();

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const toolUse = block as Anthropic.ToolUseBlock;
      let resultText = `Herramienta desconocida: ${toolUse.name}`;
      if (toolUse.name === "create_order") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resultText = await runCreateOrder(args.supabase, args.customerPhone, toolUse.input as any);
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: resultText,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return (
    finalText ||
    "Perdón, tuve un problema para responder recién. En breve te contactamos desde Bakery Box."
  );
}
