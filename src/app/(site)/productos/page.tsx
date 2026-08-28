import Link from "next/link";
import ProductCard from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/data";

export const metadata = {
  title: "Catálogo | Bakery Box",
};

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  const activeCategory = categories.find((c) => c.slug === categoria);
  const filtered = activeCategory
    ? products.filter((p) => p.category_id === activeCategory.id)
    : products;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <div className="text-center">
        <span className="font-script text-3xl text-gold-500 md:text-4xl">
          Nuestro catálogo
        </span>
        <h1 className="mt-1 font-display text-3xl text-brown-900 sm:text-4xl">
          {activeCategory ? activeCategory.name : "Todos los productos"}
        </h1>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/productos"
          className={`rounded-full px-5 py-2 text-sm font-medium transition ${
            !activeCategory
              ? "bg-brown-900 text-cream"
              : "bg-cream-dark text-brown-800 hover:bg-gold-300/40"
          }`}
        >
          Todos
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/productos?categoria=${cat.slug}`}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              activeCategory?.id === cat.id
                ? "bg-brown-900 text-cream"
                : "bg-cream-dark text-brown-800 hover:bg-gold-300/40"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-brown-800/60">
          Todavía no hay productos cargados en esta categoría.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
