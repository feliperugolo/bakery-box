"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const hasPromo =
    product.promo_active &&
    product.promo_price != null &&
    product.promo_price < product.price;
  const displayPrice = hasPromo ? product.promo_price! : product.price;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_-12px_rgba(74,46,24,0.25)]">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-cream-dark"
      >
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 40vw, 90vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {hasPromo && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow">
            Oferta
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Link href={`/productos/${product.slug}`}>
          <h3 className="font-display text-lg leading-tight text-brown-900 transition group-hover:text-gold-500">
            {product.name}
          </h3>
        </Link>
        {product.size_label && (
          <p className="text-xs text-brown-800/60">{product.size_label}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl text-brown-900">
              {formatPrice(displayPrice)}
            </span>
            {hasPromo && (
              <span className="text-sm text-brown-800/40 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <button
            onClick={() =>
              addItem({
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: displayPrice,
                sizeLabel: product.size_label,
                image: product.images[0] || null,
              })
            }
            aria-label={`Agregar ${product.name} al carrito`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brown-900 text-cream transition hover:bg-gold-500"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
