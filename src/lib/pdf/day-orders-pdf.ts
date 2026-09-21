import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";

const CANCELLED = "cancelado";

/**
 * Genera y descarga un PDF con el resumen de pedidos de un día puntual,
 * pensado para que el equipo de cocina lo imprima y arme los pedidos:
 * primero un total agregado por producto, después el detalle de cada pedido.
 */
export function downloadDayOrdersPdf(dateLabel: string, orders: Order[]) {
  const active = orders.filter((o) => o.status !== CANCELLED);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Bakery Box — Resumen de pedidos", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(dateLabel, 14, 25);
  doc.text(
    `${active.length} pedido${active.length === 1 ? "" : "s"} · generado ${new Date().toLocaleString("es-AR")}`,
    14,
    31
  );
  doc.setTextColor(0);

  // Total a preparar por producto, sumando todos los pedidos del día.
  const productMap = new Map<string, number>();
  for (const order of active) {
    for (const item of order.items) {
      const label = `${item.name}${item.size_label ? ` (${item.size_label})` : ""}`;
      productMap.set(label, (productMap.get(label) || 0) + item.quantity);
    }
  }
  const productRows = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]);

  let cursorY = 38;

  if (productRows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Total a preparar", "Cantidad"]],
      body: productRows.map(([name, qty]) => [name, String(qty)]),
      headStyles: { fillColor: [201, 155, 74] },
      styles: { fontSize: 10 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable?.finalY + 10 || cursorY + 10;
  }

  if (active.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Cliente", "Entrega", "Pago", "Detalle", "Notas"]],
      body: active.map((o) => [
        `${o.customer_name}\n${o.customer_phone}`,
        o.delivery_method === "delivery" ? `Delivery\n${o.address}` : "Retiro",
        o.payment_method === "transferencia" ? "Transferencia" : "Efectivo",
        o.items
          .map((i) => `${i.quantity}x ${i.name}${i.size_label ? ` (${i.size_label})` : ""}`)
          .join("\n"),
        o.notes || "-",
      ]),
      headStyles: { fillColor: [74, 46, 24] },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 30 } },
    });
  } else {
    doc.setFontSize(11);
    doc.text("No hay pedidos activos para este día.", 14, cursorY);
  }

  const totalActivo = active.reduce((s, o) => s + o.total, 0);
  doc.setFontSize(10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || cursorY;
  doc.text(`Total del día: ${formatPrice(totalActivo)}`, 14, finalY + 10);

  const fileSafeLabel = dateLabel.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  doc.save(`pedidos-${fileSafeLabel}.pdf`);
}
