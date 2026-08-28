import ProductForm from "@/components/admin/product-form";
import { getAllCategoriesAdmin } from "@/lib/data";

export default async function NewProductPage() {
  const categories = await getAllCategoriesAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Nuevo producto</h1>
      <p className="mt-1 text-brown-800/60">
        Completá los datos y subí al menos una foto.
      </p>
      <div className="mt-8">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
