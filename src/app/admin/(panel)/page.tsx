import Link from "next/link";
import { Cake, Tags, ClipboardList, Sparkles } from "lucide-react";
import {
  getAllCategoriesAdmin,
  getAllOrdersAdmin,
  getAllProductsAdmin,
} from "@/lib/data";
import { formatPrice } from "@/lib/format";

export default async function AdminDashboardPage() {
  const [products, categories, recentOrders] = await Promise.all([
    getAllProductsAdmin(),
    getAllCategoriesAdmin(),
    getAllOrdersAdmin(5),
  ]);

  const activeProducts = products.filter((p) => p.active).length;
  const promoProducts = products.filter((p) => p.promo_active).length;

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Resumen</h1>
      <p className="mt-1 text-brown-800/60">
        Un vistazo rápido a tu tienda.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Cake}
          label="Productos activos"
          value={`${activeProducts} / ${products.length}`}
          href="/admin/productos"
        />
        <StatCard
          icon={Tags}
          label="Categorías"
          value={String(categories.length)}
          href="/admin/categorias"
        />
        <StatCard
          icon={Sparkles}
          label="En oferta"
          value={String(promoProducts)}
          href="/admin/productos"
        />
      </div>

      <div className="mt-10 rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl text-brown-900">
            <ClipboardList className="h-5 w-5" strokeWidth={1.75} />
            Últimos pedidos
          </h2>
          <Link
            href="/admin/pedidos"
            className="text-sm font-medium text-gold-500 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-brown-800/60">
            Todavía no se registraron pedidos. Los pedidos hechos desde el
            carrito van a aparecer acá (si conectaste Supabase).
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-brown-900/10">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-brown-900">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-brown-800/50">
                    {new Date(order.created_at).toLocaleString("es-AR")}
                  </p>
                </div>
                <span className="font-display text-lg text-brown-900">
                  {formatPrice(order.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Cake;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl bg-paper p-5 shadow-[0_1px_3px_rgba(74,46,24,0.08)] transition hover:shadow-[0_8px_20px_-8px_rgba(74,46,24,0.2)]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-300/30 text-gold-500">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm text-brown-800/60">{label}</p>
        <p className="font-display text-2xl text-brown-900">{value}</p>
      </div>
    </Link>
  );
}
