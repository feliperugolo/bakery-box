import Link from "next/link";
import { Plus } from "lucide-react";
import ProductsList from "@/components/admin/products-list";
import { getAllCategoriesAdmin, getAllProductsAdmin } from "@/lib/data";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getAllProductsAdmin(),
    getAllCategoriesAdmin(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-brown-900">Productos</h1>
          <p className="mt-1 text-brown-800/60">
            Arrastrá para reordenar. Los cambios se ven al instante en la
            tienda.
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="flex items-center gap-1.5 rounded-full bg-brown-900 px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-brown-800"
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </Link>
      </div>

      <div className="mt-8">
        <ProductsList initialProducts={products} categories={categories} />
      </div>
    </div>
  );
}
