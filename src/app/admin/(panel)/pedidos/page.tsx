import OrdersManager from "@/components/admin/orders-manager";
import { getUpcomingOrdersAdmin, getProducts, getAllDiscountCodesAdmin } from "@/lib/data";

export default async function AdminOrdersPage() {
  const [orders, products, discountCodes] = await Promise.all([
    getUpcomingOrdersAdmin(),
    getProducts(),
    getAllDiscountCodesAdmin(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Pedidos</h1>
      <p className="mt-1 text-brown-800/60">
        Pedidos por delante para que el equipo de cocina los prepare. Apenas
        pasa la fecha de entrega, el pedido pasa solo al Historial.
      </p>
      <div className="mt-8">
        <OrdersManager initialOrders={orders} products={products} discountCodes={discountCodes} />
      </div>
    </div>
  );
}
