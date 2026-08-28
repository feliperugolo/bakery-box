import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/product-form";
import { getAllCategoriesAdmin, getProductByIdAdmin } from "@/lib/data";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductByIdAdmin(id),
    getAllCategoriesAdmin(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Editar producto</h1>
      <p className="mt-1 text-brown-800/60">{product.name}</p>
      <div className="mt-8">
        <ProductForm categories={categories} product={product} />
      </div>
    </div>
  );
}
