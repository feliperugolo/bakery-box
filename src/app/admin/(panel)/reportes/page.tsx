import {
  BarChart3,
  Wallet,
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Truck,
  Store,
  Landmark,
  Banknote,
  XCircle,
} from "lucide-react";
import { getAllOrdersAdmin } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { buildSalesReport } from "@/lib/reports";

export default async function ReportesPage() {
  const orders = await getAllOrdersAdmin();
  const report = buildSalesReport(orders);

  const maxDaily = Math.max(1, ...report.dailySales.map((d) => d.total));
  const maxWeekday = Math.max(1, ...report.ordersByWeekday.map((d) => d.count));
  const paidTotal = report.paidAmount + report.pendingAmount;
  const paidPct = paidTotal ? Math.round((report.paidAmount / paidTotal) * 100) : 0;

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Reportes</h1>
      <p className="mt-1 text-brown-800/60">
        Ventas, cobros y productos más pedidos.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-paper p-10 text-center text-brown-800/60 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
          Todavía no hay pedidos para generar reportes.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={TrendingUp}
              label="Ventas del mes"
              value={formatPrice(report.salesThisMonth)}
              sub={`${report.ordersThisMonth} pedido${report.ordersThisMonth === 1 ? "" : "s"}`}
            />
            <StatCard
              icon={BarChart3}
              label="Ventas de la semana"
              value={formatPrice(report.salesThisWeek)}
              sub={`${report.ordersThisWeek} pedido${report.ordersThisWeek === 1 ? "" : "s"}`}
            />
            <StatCard
              icon={CircleDollarSign}
              label="Pendiente de cobro"
              value={formatPrice(report.pendingAmount)}
              sub={`${report.pendingCount} pedido${report.pendingCount === 1 ? "" : "s"} sin cobrar`}
              accent={report.pendingCount > 0 ? "warn" : undefined}
            />
            <StatCard
              icon={Receipt}
              label="Ticket promedio"
              value={formatPrice(report.avgTicket)}
              sub={`${report.totalOrders} pedidos totales`}
            />
          </div>

          {/* Ventas por día */}
          <div className="mt-8 rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
            <h2 className="font-display text-xl text-brown-900">Ventas por día</h2>
            <p className="mt-0.5 text-sm text-brown-800/50">Últimos 30 días</p>
            <div className="mt-6 overflow-x-auto">
              <div className="flex min-w-[640px] items-end gap-1.5" style={{ height: 160 }}>
                {report.dailySales.map((d) => (
                  <div
                    key={d.date}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                  >
                    <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-lg bg-brown-900 px-2 py-1 text-xs text-cream group-hover:block">
                      {d.label}: {formatPrice(d.total)}
                    </div>
                    <div
                      className="w-full rounded-t-sm bg-gold-400 transition group-hover:bg-gold-500"
                      style={{ height: `${Math.max(2, (d.total / maxDaily) * 130)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex min-w-[640px] justify-between text-[10px] text-brown-800/40">
                <span>{report.dailySales[0]?.label}</span>
                <span>{report.dailySales[report.dailySales.length - 1]?.label}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {/* Productos más vendidos - semana */}
            <TopProductsCard title="Más vendidos esta semana" products={report.topProductsWeek} />
            {/* Productos más vendidos - mes */}
            <TopProductsCard title="Más vendidos este mes" products={report.topProductsMonth} />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {/* Cobros */}
            <div className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
              <h2 className="flex items-center gap-2 font-display text-lg text-brown-900">
                <Wallet className="h-5 w-5" strokeWidth={1.75} />
                Cobros
              </h2>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-red-500/15">
                <div className="h-full rounded-full bg-green-600" style={{ width: `${paidPct}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-brown-800/70">
                  <span className="font-medium text-green-700">Cobrado</span> ·{" "}
                  {formatPrice(report.paidAmount)}
                </span>
                <span className="text-brown-800/70">
                  <span className="font-medium text-red-600">Pendiente</span> ·{" "}
                  {formatPrice(report.pendingAmount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-brown-800/40">{paidPct}% cobrado sobre pedidos activos</p>
            </div>

            {/* Entrega vs retiro */}
            <div className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
              <h2 className="font-display text-lg text-brown-900">Entrega vs. retiro</h2>
              <div className="mt-4 space-y-3">
                <BreakdownRow
                  icon={Truck}
                  label="Delivery"
                  count={report.deliveryVsPickup.delivery}
                  total={report.totalOrders}
                />
                <BreakdownRow
                  icon={Store}
                  label="Retiro"
                  count={report.deliveryVsPickup.pickup}
                  total={report.totalOrders}
                />
              </div>
            </div>

            {/* Método de pago */}
            <div className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
              <h2 className="font-display text-lg text-brown-900">Método de pago</h2>
              <div className="mt-4 space-y-3">
                <BreakdownRow
                  icon={Landmark}
                  label="Transferencia"
                  count={report.paymentMethodBreakdown.transferencia}
                  total={report.totalOrders}
                />
                <BreakdownRow
                  icon={Banknote}
                  label="Efectivo"
                  count={report.paymentMethodBreakdown.efectivo}
                  total={report.totalOrders}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {/* Pedidos por día de la semana */}
            <div className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
              <h2 className="font-display text-lg text-brown-900">Pedidos por día de la semana</h2>
              <p className="mt-0.5 text-sm text-brown-800/50">
                Para saber qué días conviene reforzar producción
              </p>
              <div className="mt-6 flex items-end gap-3" style={{ height: 120 }}>
                {report.ordersByWeekday.map((d) => (
                  <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-medium text-brown-800/60">{d.count || ""}</span>
                    <div
                      className="w-full rounded-t-sm bg-brown-700/70"
                      style={{ height: `${Math.max(2, (d.count / maxWeekday) * 80)}px` }}
                    />
                    <span className="text-xs text-brown-800/50">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Otros */}
            <div className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
              <h2 className="font-display text-lg text-brown-900">Otros datos</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-brown-800/70">
                    <XCircle className="h-4 w-4 text-red-500" strokeWidth={1.75} />
                    Pedidos cancelados
                  </span>
                  <span className="font-medium text-brown-900">{report.cancelledCount}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-brown-800/70">Pedidos totales (histórico)</span>
                  <span className="font-medium text-brown-900">{orders.length}</span>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  accent?: "warn";
}) {
  return (
    <div className="rounded-2xl bg-paper p-5 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            accent === "warn" ? "bg-red-500/10 text-red-600" : "bg-gold-300/30 text-gold-500"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-brown-800/60">{label}</p>
          <p className="font-display text-2xl text-brown-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-brown-800/45">{sub}</p>}
    </div>
  );
}

function TopProductsCard({
  title,
  products,
}: {
  title: string;
  products: { name: string; quantity: number; revenue: number }[];
}) {
  const max = Math.max(1, ...products.map((p) => p.quantity));
  return (
    <div className="rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
      <h2 className="font-display text-lg text-brown-900">{title}</h2>
      {products.length === 0 ? (
        <p className="mt-4 text-sm text-brown-800/50">Sin ventas en este período.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {products.map((p, i) => (
            <li key={p.name}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-brown-900">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brown-900/5 text-[11px] font-medium text-brown-800/60">
                    {i + 1}
                  </span>
                  <span className="truncate font-medium">{p.name}</span>
                </span>
                <span className="shrink-0 text-brown-800/50">
                  {p.quantity} u · {formatPrice(p.revenue)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brown-900/5">
                <div
                  className="h-full rounded-full bg-gold-400"
                  style={{ width: `${(p.quantity / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BreakdownRow({
  icon: Icon,
  label,
  count,
  total,
}: {
  icon: typeof Truck;
  label: string;
  count: number;
  total: number;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-brown-800/70">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          {label}
        </span>
        <span className="text-brown-800/50">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brown-900/5">
        <div className="h-full rounded-full bg-brown-700/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

