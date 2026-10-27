// Service worker del panel de Bakery Box. Lo único que hace es escuchar
// notificaciones push (para avisar al equipo cuando una conversación de
// WhatsApp necesita respuesta humana) y mantener actualizado el numerito
// rojo del ícono de la app en la pantalla de inicio (Badging API).
//
// No cachea nada de la app — no es necesario para esto y evita que el
// panel quede mostrando una versión vieja por error de caché.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Bakery Box", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Bakery Box";
  const body = data.body || "Hay una conversación que necesita respuesta.";
  const unreadCount = typeof data.unreadCount === "number" ? data.unreadCount : null;

  const showNotification = self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "bakery-box-attention",
    renotify: true,
    data: { url: data.url || "/admin/whatsapp" },
  });

  // El numerito rojo del ícono: si no hay más conversaciones pendientes,
  // se limpia; si hay, muestra la cantidad real.
  let badgeUpdate = Promise.resolve();
  if (navigator.setAppBadge) {
    badgeUpdate =
      unreadCount && unreadCount > 0
        ? navigator.setAppBadge(unreadCount)
        : navigator.clearAppBadge
          ? navigator.clearAppBadge()
          : Promise.resolve();
  }

  event.waitUntil(Promise.all([showNotification, badgeUpdate]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/whatsapp";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
