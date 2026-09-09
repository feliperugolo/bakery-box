import WhatsappInbox from "@/components/admin/whatsapp-inbox";
import { getAllWhatsappConversationsAdmin } from "@/lib/data";
import { isWhatsappApiConfigured } from "@/lib/whatsapp/send";
import { isBotConfigured } from "@/lib/whatsapp/agent";

export default async function AdminWhatsappPage() {
  const conversations = await getAllWhatsappConversationsAdmin();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-screen">
      <div className="shrink-0">
        <h1 className="font-display text-3xl text-brown-900">WhatsApp</h1>
        <p className="mt-1 text-brown-800/60">
          Conversaciones del bot con tus clientes. Podés tomar cualquier
          charla a mano cuando quieras.
        </p>
        {(!isWhatsappApiConfigured || !isBotConfigured) && (
          <div className="mt-4 rounded-xl border border-gold-400/40 bg-gold-500/10 px-4 py-3 text-sm text-brown-800">
            Todavía falta terminar de configurar el bot ({!isWhatsappApiConfigured && "conexión con WhatsApp"}
            {!isWhatsappApiConfigured && !isBotConfigured && " y "}
            {!isBotConfigured && "la IA"}). Mientras tanto podés seguir usando
            esta sección para ver y responder mensajes a mano una vez que
            lleguen.
          </div>
        )}
      </div>
      <div className="mt-6 flex-1 overflow-hidden">
        <WhatsappInbox initialConversations={conversations} />
      </div>
    </div>
  );
}
