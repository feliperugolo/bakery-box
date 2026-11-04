const GRAPH_API_VERSION = "v23.0";

export type WhatsappTemplateParam = {
  // El nombre del placeholder tal cual aparece en el texto: "customer_name"
  // para plantillas nuevas (parámetros con nombre), o "1", "2", etc. para
  // las viejas plantillas posicionales.
  name: string;
  example: string | null;
};

export type WhatsappTemplateSummary = {
  name: string;
  language: string;
  category: string;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  params: WhatsappTemplateParam[];
};

type MetaTemplateComponent = {
  type: string;
  text?: string;
  example?: {
    body_text?: string[][];
    body_text_named_params?: { param_name: string; example?: string }[];
    header_text?: string[];
    header_text_named_params?: { param_name: string; example?: string }[];
  };
};

type MetaTemplate = {
  name: string;
  language: string;
  status: string;
  category: string;
  components: MetaTemplateComponent[];
};

/**
 * Saca los placeholders de un texto de plantilla ({{customer_name}} o
 * {{1}}) y les busca su valor de ejemplo, si Meta mandó uno — así el
 * formulario puede mostrar un placeholder útil en vez de un campo vacío.
 */
function extractParams(
  text: string,
  namedExamples?: { param_name: string; example?: string }[],
  positionalExamples?: string[]
): WhatsappTemplateParam[] {
  const matches = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)];
  return matches.map((m, i) => {
    const name = m[1];
    const namedExample = namedExamples?.find((e) => e.param_name === name)?.example;
    const positionalExample = positionalExamples?.[i];
    return { name, example: namedExample || positionalExample || null };
  });
}

/**
 * Trae del WhatsApp Manager (vía Meta Graph API) las plantillas APROBADAS
 * de la cuenta de WhatsApp Business configurada. No hace falta mantener
 * esto a mano: en cuanto Meta aprueba una plantilla nueva, aparece acá
 * solo, sin tocar código.
 */
export async function fetchApprovedTemplates(): Promise<WhatsappTemplateSummary[]> {
  const token = process.env.WHATSAPP_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !wabaId) {
    throw new Error(
      "Falta configurar WHATSAPP_TOKEN o WHATSAPP_BUSINESS_ACCOUNT_ID para poder leer las plantillas de WhatsApp."
    );
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`);
  url.searchParams.set("fields", "name,language,status,category,components");
  url.searchParams.set("limit", "200");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Error al leer las plantillas de WhatsApp: ${JSON.stringify(data)}`);
  }

  const templates: MetaTemplate[] = data?.data || [];

  return templates
    .filter((t) => t.status === "APPROVED")
    .map((t) => {
      const header = t.components.find((c) => c.type === "HEADER" && c.text);
      const body = t.components.find((c) => c.type === "BODY");
      const footer = t.components.find((c) => c.type === "FOOTER");
      const bodyText = body?.text || "";

      const params = extractParams(
        bodyText,
        body?.example?.body_text_named_params,
        body?.example?.body_text?.[0]
      );

      return {
        name: t.name,
        language: t.language,
        category: t.category,
        headerText: header?.text || null,
        bodyText,
        footerText: footer?.text || null,
        params,
      };
    })
    // Las más probables de usarse primero: las de marketing/utilidad antes
    // que las de autenticación (OTP), que no se mandan a mano nunca.
    .sort((a, b) => a.name.localeCompare(b.name));
}
