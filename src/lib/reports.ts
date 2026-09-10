import { Order } from "./types";

const CANCELLED = "cancelado";

function isCounted(o: Order) {
  return o.status !== CANCELLED;
}

// Lunes como inicio de semana (estándar en Argentina).
export function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type TopProduct = { name: string; quantity: number; revenue: number };

export type SalesReport = {
  salesThisWeek: number;
  ordersThisWeek: number;
  salesThisMonth: number;
  ordersThisMonth: number;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
  avgTicket: number;
  totalOrders: number;
  dailySales: { date: string; label: string; total: number }[];
  topProductsWeek: TopProduct[];
  topProductsMonth: TopProduct[];
  deliveryVsPickup: { delivery: number; pickup: number };
  paymentMethodBreakdown: { transferencia: number; efectivo: number };
  ordersByWeekday: { label: string; count: number }[];
  cancelledCount: number;
};

function topProducts(orders: Order[], limit = 6): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const o of orders) {
    for (const item of o.items) {
      const cur = map.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
      cur.quantity += item.quantity;
      cur.revenue += item.unit_price * item.quantity;
      map.set(item.name, cur);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function buildSalesReport(orders: Order[]): SalesReport {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const counted = orders.filter(isCounted);

  const thisWeekOrders = counted.filter((o) => new Date(o.created_at) >= weekStart);
  const thisMonthOrders = counted.filter((o) => new Date(o.created_at) >= monthStart);

  const salesThisWeek = thisWeekOrders.reduce((s, o) => s + o.total, 0);
  const salesThisMonth = thisMonthOrders.reduce((s, o) => s + o.total, 0);

  const pending = counted.filter((o) => !o.paid);
  const paid = counted.filter((o) => o.paid);
  const pendingAmount = pending.reduce((s, o) => s + o.total, 0);
  const paidAmount = paid.reduce((s, o) => s + o.total, 0);

  const avgTicket = counted.length
    ? counted.reduce((s, o) => s + o.total, 0) / counted.length
    : 0;

  // Ventas por día, últimos 30 días.
  const dailyMap = new Map<string, number>();
  const days: { date: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    dailyMap.set(key, 0);
    days.push({ date: key, label: d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) });
  }
  for (const o of counted) {
    const key = new Date(o.created_at).toLocaleDateString("en-CA");
    if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key)! + o.total);
  }
  const dailySales = days.map((d) => ({ ...d, total: dailyMap.get(d.date) || 0 }));

  const deliveryVsPickup = {
    delivery: counted.filter((o) => o.delivery_method === "delivery").length,
    pickup: counted.filter((o) => o.delivery_method === "retiro").length,
  };
  const paymentMethodBreakdown = {
    transferencia: counted.filter((o) => o.payment_method === "transferencia").length,
    efectivo: counted.filter((o) => o.payment_method === "efectivo").length,
  };

  const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weekdayCounts = new Array(7).fill(0);
  for (const o of counted) {
    weekdayCounts[new Date(o.created_at).getDay()]++;
  }
  const ordersByWeekday = weekdayLabels.map((label, i) => ({ label, count: weekdayCounts[i] }));

  return {
    salesThisWeek,
    ordersThisWeek: thisWeekOrders.length,
    salesThisMonth,
    ordersThisMonth: thisMonthOrders.length,
    pendingAmount,
    pendingCount: pending.length,
    paidAmount,
    paidCount: paid.length,
    avgTicket,
    totalOrders: counted.length,
    dailySales,
    topProductsWeek: topProducts(thisWeekOrders),
    topProductsMonth: topProducts(thisMonthOrders),
    deliveryVsPickup,
    paymentMethodBreakdown,
    ordersByWeekday,
    cancelledCount: orders.length - counted.length,
  };
}

