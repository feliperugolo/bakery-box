"use client";

import { Download } from "lucide-react";
import { Order } from "@/lib/types";
import { downloadSalesReportPdf } from "@/lib/pdf/sales-report-pdf";

export default function ReportPdfButtons({
  weekOrders,
  weekLabel,
  monthOrders,
  monthLabel,
}: {
  weekOrders: Order[];
  weekLabel: string;
  monthOrders: Order[];
  monthLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => downloadSalesReportPdf({ periodLabel: weekLabel, orders: weekOrders })}
        className="flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-sm font-medium text-brown-800 shadow-[0_1px_3px_rgba(74,46,24,0.08)] transition hover:bg-cream-dark"
      >
        <Download className="h-4 w-4" strokeWidth={1.75} />
        PDF semanal
      </button>
      <button
        onClick={() => downloadSalesReportPdf({ periodLabel: monthLabel, orders: monthOrders })}
        className="flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-sm font-medium text-brown-800 shadow-[0_1px_3px_rgba(74,46,24,0.08)] transition hover:bg-cream-dark"
      >
        <Download className="h-4 w-4" strokeWidth={1.75} />
        PDF mensual
      </button>
    </div>
  );
}
