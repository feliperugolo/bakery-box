import { NextResponse } from "next/server";

const GRAPH_API_VERSION = "v23.0";

/**
 * Ruta de diagnóstico TEMPORAL — solo para inspeccionar la plantilla real
 * que Meta tiene guardada y entender por qué falla el envío con
 * "Parameter name is missing or empty". Se borra una vez resuelto.
 */
export async function GET() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "primer_contacto_pedido";

  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: "Faltan env vars de WhatsApp" }, { status: 500 });
  }

  const result: Record<string, unknown> = { templateName };

  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugRes.json();
    result.debugToken = debugData;

    const scopes = debugData?.data?.granular_scopes as
      | { scope: string; target_ids?: string[] }[]
      | undefined;
    const wabaScope = scopes?.find((s) =>
      ["whatsapp_business_management", "whatsapp_business_messaging"].includes(s.scope)
    );
    const wabaId = wabaScope?.target_ids?.[0];
    result.wabaId = wabaId || null;

    if (wabaId) {
      const tplRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?name=${templateName}&fields=name,status,language,category,components`
      );
      const tplData = await tplRes.json();
      result.template = tplData;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
