import CategoriesManager from "@/components/admin/categories-manager";
import { getAllCategoriesAdmin } from "@/lib/data";

export default async function AdminCategoriesPage() {
  const categories = await getAllCategoriesAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Categorías</h1>
      <p className="mt-1 text-brown-800/60">
        Ordená, activá/desactivá o eliminá categorías. Los productos se
        agrupan por categoría en el catálogo.
      </p>
      <div className="mt-8">
        <CategoriesManager initialCategories={categories} />
      </div>
    </div>
  );
}
