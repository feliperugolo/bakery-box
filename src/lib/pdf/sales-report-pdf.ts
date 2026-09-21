import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";

const CANCELLED = "cancelado";

/**
 * Genera y descarga un PDF con el resumen de ventas de un período (semana o
 * mes): totales, cobros, medio de pago de cada venta y productos más
 * vendidos.
 */
export function downloadSalesReportPdf(args: { periodLabel: string; orders: Order[] }) {
  const { periodLabel, orders } = args;
  const active = orders.filter((o) => o.status !== CANCELLED);

  const total = active.reduce((s, o) => s + o.total, 0);
  const paid = active.filter((o) => o.paid);
  const pending = active.filter((o) => !o.paid);
  const paidAmount = paid.reduce((s, o) => s + o.total, 0);
  const pendingAmount = pending.reduce((s, o) => s + o.total, 0);
  const avgTicket = active.length ? total / active.length : 0;

  const paymentBreakdown = new Map<string, { count: number; amount: number }>();
  for (const o of active) {
    const key = o.payment_method === "transferencia" ? "Transferencia" : "Efectivo";
    const cur = paymentBreakdown.get(key) || { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += o.total;
    paymentBreakdown.set(key, cur);
  }

  const productMap = new Map<string, { quantity: number; revenue: number }>();
  for (const o of active) {
    for (const item of o.items) {
      const cur = productMap.get(item.name) || { quantity: 0, revenue: 0 };
      cur.quantity += item.quantity;
      cur.revenue += item.unit_price * item.quantity;
      productMap.set(item.name, cur);
    }
  }
  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 10);

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Bakery Box — Resumen de ventas", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(periodLabel, 14, 25);
  doc.text(`Generado ${new Date().toLocaleString("es-AR")}`, 14, 31);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 38,
    head: [["Ventas totales", "Pedidos", "Ticket promedio", "Cobrado", "Pendiente"]],
    body: [[
      formatPrice(total),
      String(active.length),
      formatPrice(avgTicket),
      formatPrice(paidAmount),
      formatPrice(pendingAmount),
    ]],
    headStyles: { fillColor: [74, 46, 24] },
    styles: { fontSize: 10, halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursorY = (doc as any).lastAutoTable?.finalY + 10 || 55;

  doc.setFontSize(12);
  doc.text("Medio de pago", 14, cursorY);
  autoTable(doc, {
    startY: cursorY + 4,
    head: [["Método", "Cantidad", "Monto"]],
    body: Array.from(paymentBreakdown.entries()).map(([method, v]) => [
      method,
      String(v.count),
      formatPrice(v.amount),
    ]),
    headStyles: { fillColor: [201, 155, 74] },
    styles: { fontSize: 10 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = (doc as any).lastAutoTable?.finalY + 12 || cursorY + 40;

  if (topProducts.length > 0) {
    doc.setFontSize(12);
    doc.text("Productos más vendidos", 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Producto", "Cantidad", "Facturación"]],
      body: topProducts.map(([name, v]) => [name, String(v.quantity), formatPrice(v.revenue)]),
      headStyles: { fillColor: [201, 155, 74] },
      styles: { fontSize: 10 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable?.finalY + 12 || cursorY + 40;
  }

  if (active.length > 0) {
    doc.setFontSize(12);
    doc.text("Detalle de pedidos", 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Fecha", "Cliente", "Medio de pago", "Estado de pago", "Total"]],
      body: active
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((o) => [
          new Date(o.created_at).toLocaleDateString("es-AR"),
          o.customer_name,
          o.payment_method === "transferencia" ? "Transferencia" : "Efectivo",
          o.paid ? "Pagado" : "Pendiente",
          formatPrice(o.total),
        ]),
      headStyles: { fillColor: [74, 46, 24] },
      styles: { fontSize: 9 },
    });
  }

  const fileSafeLabel = periodLabel.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  doc.save(`reporte-ventas-${fileSafeLabel}.pdf`);
}
