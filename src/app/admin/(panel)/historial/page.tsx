import OrderHistoryManager from "@/components/admin/order-history-manager";
import { getOrderHistoryAdmin } from "@/lib/data";

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toLocaleDateString("en-CA");
}

export default async function AdminOrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from || defaultFrom();
  const to = params.to || todayStr();

  const orders = await getOrderHistoryAdmin({ from, to });

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Historial de pedidos</h1>
      <p className="mt-1 text-brown-800/60">
        Pedidos cuya fecha de entrega ya pasó. Marcá acá si quedaron pagados o
        no, y buscá pedidos de fechas anteriores.
      </p>
      <div className="mt-8">
        <OrderHistoryManager initialOrders={orders} from={from} to={to} />
      </div>
    </div>
  );
}
