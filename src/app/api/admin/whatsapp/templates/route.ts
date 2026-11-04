import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchApprovedTemplates } from "@/lib/whatsapp/templates";

/**
 * Lista las plantillas de WhatsApp aprobadas por Meta, para que el panel
 * pueda armar los botones de "mandar plantilla" sin tener que hardcodear
 * ninguna — en cuanto se aprueba una nueva, aparece acá sola.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const templates = await fetchApprovedTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Error leyendo plantillas de WhatsApp:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
