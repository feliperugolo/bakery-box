// Los pedidos solo se entregan de lunes a sábado (no domingos). Esta lista
// arma las próximas fechas disponibles para que el cliente elija el día de
// entrega en el carrito.
export type DeliveryDayOption = {
  value: string; // YYYY-MM-DD
  label: string; // ej: "Lunes 8 de septiembre"
};

const SUNDAY = 0;

export function getDeliveryDayOptions(count = 14): DeliveryDayOption[] {
  const options: DeliveryDayOption[] = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1); // el pedido de hoy no se entrega el mismo día

  while (options.length < count) {
    if (date.getDay() !== SUNDAY) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const value = `${year}-${month}-${day}`;
      const rawLabel = date.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      options.push({
        value,
        label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
      });
    }
    date.setDate(date.getDate() + 1);
  }

  return options;
}

export function formatDeliveryDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const rawLabel = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
}


// --- Política de cierre semanal de pedidos ---
//
// Tomamos pedidos con 48hs de anticipación. Como entregamos de lunes a
// sábado, el último momento para pedir "con normalidad" en la semana es el
// jueves hasta las 23:59. Desde el viernes y hasta las 18:00 todavía se
// puede tomar un pedido para entregar al día siguiente (sábado), pero queda
// sujeto a stock disponible — alguien del equipo lo confirma. Pasadas las
// 18:00 del viernes (y durante el resto del fin de semana), ya no se puede
// conseguir nada para antes del lunes siguiente: hay que pedir con más
// anticipación.
//
// Todo esto se calcula siempre en hora de Argentina, sin importar en qué
// huso horario corra el servidor (Netlify corre en UTC).

const BA_TIME_ZONE = "America/Argentina/Buenos_Aires";

function getBuenosAiresParts(now: Date): {
  dateStr: string;
  dayOfWeek: number; // 0 = domingo ... 6 = sábado
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    dayOfWeek: weekdayMap[map.weekday] ?? 1,
    // Algunos entornos devuelven "24" para la medianoche con hour12:false.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type WeeklyCutoffWindow = "normal" | "friday_stock" | "weekend_late";

/**
 * En qué momento de la semana (hora Argentina) estamos ahora, sin todavía
 * mirar ninguna fecha de entrega puntual. Lo usa el prompt del bot para
 * explicarle al cliente la situación actual aunque todavía no haya elegido
 * fecha.
 */
export function getWeeklyCutoffWindow(now: Date = new Date()): {
  window: WeeklyCutoffWindow;
  tomorrowDateStr: string;
  nextMondayDateStr: string;
} {
  const ba = getBuenosAiresParts(now);
  const tomorrowDateStr = addDays(ba.dateStr, 1);
  const daysUntilMonday = ((1 - ba.dayOfWeek + 7) % 7) || 7;
  const nextMondayDateStr = addDays(ba.dateStr, daysUntilMonday);

  // Lunes a jueves: ciclo normal de pedidos de la semana.
  if (ba.dayOfWeek >= 1 && ba.dayOfWeek <= 4) {
    return { window: "normal", tomorrowDateStr, nextMondayDateStr };
  }

  if (ba.dayOfWeek === 5) {
    const pastFridayCutoff = ba.hour > 18 || (ba.hour === 18 && ba.minute > 0);
    if (!pastFridayCutoff) {
      return { window: "friday_stock", tomorrowDateStr, nextMondayDateStr };
    }
  }

  // Viernes después de las 18:00, sábado o domingo.
  return { window: "weekend_late", tomorrowDateStr, nextMondayDateStr };
}

export type OrderTimingMode = "normal" | "subject_to_stock" | "too_late";

/**
 * Evalúa, para una fecha de entrega puntual, si el pedido se puede tomar
 * con normalidad, queda sujeto a stock disponible, o ya es demasiado tarde
 * para esa fecha. La usa create_order como última red de seguridad, por si
 * el bot no aplicó bien lo que dice el prompt.
 */
export function evaluateOrderTiming(
  deliveryDateStr: string,
  now: Date = new Date()
): { mode: OrderTimingMode; tomorrowDateStr: string; nextMondayDateStr: string } {
  const { window, tomorrowDateStr, nextMondayDateStr } = getWeeklyCutoffWindow(now);

  let mode: OrderTimingMode = "normal";
  if (window === "friday_stock" && deliveryDateStr === tomorrowDateStr) {
    mode = "subject_to_stock";
  } else if (window === "weekend_late" && deliveryDateStr < nextMondayDateStr) {
    mode = "too_late";
  }

  return { mode, tomorrowDateStr, nextMondayDateStr };
}
