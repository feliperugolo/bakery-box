import CustomersManager from "@/components/admin/customers-manager";
import { getAllOrdersAdmin, getCustomersAdmin } from "@/lib/data";

export default async function AdminCustomersPage() {
  const [customers, orders] = await Promise.all([
    getCustomersAdmin(),
    getAllOrdersAdmin(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Clientes</h1>
      <p className="mt-1 text-brown-800/60">
        Agendá clientes a mano y mirá su historial de pedidos. Los que
        pidieron más de una vez quedan marcados como recurrentes, y desde su
        ficha podés crearles un código de descuento personal.
      </p>
      <div className="mt-8">
        <CustomersManager initialCustomers={customers} allOrders={orders} />
      </div>
    </div>
  );
}
