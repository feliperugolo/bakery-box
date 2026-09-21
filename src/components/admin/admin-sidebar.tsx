"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Cake,
  Tags,
  ClipboardList,
  History,
  Settings,
  LogOut,
  ExternalLink,
  Tag,
  MessageCircle,
  BarChart3,
  BellRing,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WhatsappConversation } from "@/lib/types";

const links = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Cake },
  { href: "/admin/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/historial", label: "Historial", icon: History },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

// Suena una campanita corta con Web Audio API, sin necesidad de un archivo de audio.
function playAttentionBeep() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.42);
    oscillator.onended = () => ctx.close();
  } catch {
    // Si el navegador bloquea el audio (falta interacción del usuario, etc.) no hacemos nada.
  }
}

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [attentionCount, setAttentionCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >("unsupported");
  const knownAttentionIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      if (typeof Notification !== "undefined") {
        setNotifPermission(Notification.permission);
      }

      const { data } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("needs_attention", true);
      knownAttentionIds.current = new Set((data || []).map((c: { id: string }) => c.id));
      setAttentionCount(knownAttentionIds.current.size);
      initialized.current = true;
    })();

    const channel = supabase
      .channel("whatsapp_conversations_attention")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        (payload) => {
          const row = payload.new as WhatsappConversation | undefined;
          if (!row?.id) return;

          const wasFlagged = knownAttentionIds.current.has(row.id);

          if (row.needs_attention && !wasFlagged) {
            knownAttentionIds.current.add(row.id);
            // No avisar por conversaciones que ya estaban marcadas antes de cargar el panel.
            if (initialized.current) {
              playAttentionBeep();
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("Bakery Box · WhatsApp", {
                  body: `${row.customer_name?.trim() || row.phone_number} necesita una respuesta del equipo`,
                });
              }
            }
          } else if (!row.needs_attention && wasFlagged) {
            knownAttentionIds.current.delete(row.id);
          }

          setAttentionCount(knownAttentionIds.current.size);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-brown-900/10 bg-paper md:w-64">
      <div className="flex items-center gap-2.5 border-b border-brown-900/10 px-5 py-4">
        <Image
          src="/images/brand/logo-badge.webp"
          alt="Bakery Box"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full"
        />
        <div className="min-w-0">
          <p className="font-display text-base text-brown-900">Bakery Box</p>
          <p className="truncate text-xs text-brown-800/50">{email}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          const showAttentionBadge = href === "/admin/whatsapp" && attentionCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-brown-900 text-cream"
                  : "text-brown-800 hover:bg-cream-dark"
              }`}
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {showAttentionBadge && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {attentionCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-brown-900/10 px-3 py-4">
        {notifPermission === "default" && (
          <button
            onClick={requestNotifPermission}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-brown-800 hover:bg-cream-dark"
          >
            <BellRing className="h-4 w-4" strokeWidth={1.75} />
            Activar notificaciones
          </button>
        )}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-brown-800 hover:bg-cream-dark"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          Ver sitio
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-brown-800 hover:bg-cream-dark"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
