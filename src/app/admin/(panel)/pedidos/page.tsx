import OrdersManager from "@/components/admin/orders-manager";
import { getAllOrdersAdmin } from "@/lib/data";

export default async function AdminOrdersPage() {
  const orders = await getAllOrdersAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Pedidos</h1>
      <p className="mt-1 text-brown-800/60">
        Los pedidos hechos desde el carrito se guardan acá además de mandarse
        por WhatsApp.
      </p>
      <div className="mt-8">
        <OrdersManager initialOrders={orders} />
      </div>
    </div>
  );
}
