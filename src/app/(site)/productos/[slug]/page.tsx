import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductGallery from "@/components/product-gallery";
import ProductDetailActions from "@/components/product-detail-actions";
import ProductCard from "@/components/product-card";
import { formatPrice } from "@/lib/format";
import { getProductBySlug, getProducts } from "@/lib/data";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const allProducts = await getProducts();
  const related = allProducts
    .filter((p) => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, 4);

  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasPromo =
    !hasSizes &&
    product.promo_active &&
    product.promo_price != null &&
    product.promo_price < product.price;
  const sizePrices = hasSizes ? product.sizes.map((s) => s.price) : [];
  const minSizePrice = hasSizes ? Math.min(...sizePrices) : null;
  const maxSizePrice = hasSizes ? Math.max(...sizePrices) : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1 text-sm text-brown-800/70 hover:text-gold-500"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          <h1 className="font-display text-3xl leading-tight text-brown-900 sm:text-4xl">
            {product.name}
          </h1>
          {product.size_label && (
            <p className="mt-2 text-sm text-brown-800/60">{product.size_label}</p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            {hasSizes ? (
              <span className="text-3xl font-semibold text-brown-900">
                {minSizePrice === maxSizePrice
                  ? formatPrice(minSizePrice!)
                  : `Desde ${formatPrice(minSizePrice!)}`}
              </span>
            ) : (
              <>
                <span className="text-3xl font-semibold text-brown-900">
                  {formatPrice(hasPromo ? product.promo_price! : product.price)}
                </span>
                {hasPromo && (
                  <span className="text-lg text-brown-800/40 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-6 max-w-md leading-relaxed text-brown-800/80">
              {product.description}
            </p>
          )}

          <ProductDetailActions product={product} />

          <p className="mt-6 text-xs text-brown-800/50">
            * Los pedidos se coordinan por WhatsApp una vez confirmado el
            carrito. Consultanos tiempos de elaboración para fechas
            especiales.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-brown-900">
            También te puede gustar
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
