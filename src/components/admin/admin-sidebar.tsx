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
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WhatsappConversation } from "@/lib/types";

const links = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Cake },
  { href: "/admin/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
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

// Convierte la clave pública VAPID (base64url) al formato Uint8Array que
// pide PushManager.subscribe().
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Registra el service worker del panel y suscribe este dispositivo a
// notificaciones push, guardando la suscripción en Supabase para que el
// servidor le pueda avisar cuando una charla necesita al equipo — esto es
// lo que hace que llegue el aviso y el numerito rojo aunque la app esté
// cerrada.
async function subscribeToPush() {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

    const supabase = createClient();
    await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      { onConflict: "endpoint" }
    );
  } catch (err) {
    // Si falla la suscripción (navegador sin soporte, PWA no instalada
    // todavía, etc.) no rompemos el panel — el aviso sonoro/visual con la
    // app abierta sigue funcionando igual.
    console.error("No se pudo suscribir a notificaciones push:", err);
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
    if (result === "granted") {
      await subscribeToPush();
    }
  };

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      if (typeof Notification !== "undefined") {
        setNotifPermission(Notification.permission);
        if (Notification.permission === "granted") {
          // Ya tenía el permiso concedido de antes: nos asegura que la
          // suscripción push siga existiendo (por ejemplo si la borraron
          // del lado del servidor, o es un dispositivo nuevo).
          subscribeToPush();
        }
      }

      await loadAttention();
      initialized.current = true;
    })();

    async function loadAttention() {
      const { data } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("needs_attention", true);
      knownAttentionIds.current = new Set((data || []).map((c: { id: string }) => c.id));
      setAttentionCount(knownAttentionIds.current.size);
    }

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

    // La conexión de Realtime se puede quedar "dormida" sin avisar cuando el
    // celular bloquea la pantalla o manda la app a segundo plano un rato
    // largo. Cada vez que el panel vuelve a primer plano, releemos el
    // conteo de una para no depender solo del socket — así el numerito y
    // el badge del ícono nunca quedan desactualizados sin un refresh manual.
    const handleVisible = () => {
      if (document.visibilityState === "visible") loadAttention();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    window.addEventListener("online", handleVisible);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
      window.removeEventListener("online", handleVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  // Mantiene el numerito rojo del ícono de la app (pantalla de inicio en
  // iOS, dock/taskbar en desktop) sincronizado mientras el panel está
  // abierto. Esto es un complemento del aviso por push — cubre el caso en
  // que el panel ya está abierto y no hace falta esperar la ida y vuelta
  // de una notificación push para actualizar el numerito.
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (!nav.setAppBadge) return;
      if (attentionCount > 0) {
        nav.setAppBadge(attentionCount).catch(() => {});
      } else if (nav.clearAppBadge) {
        nav.clearAppBadge().catch(() => {});
      }
    } catch {
      // Badging API no soportada en este navegador — no hacemos nada.
    }
  }, [attentionCount]);

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
