"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";

const HOVER_CYCLE_MS = 2000;

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const hasSizes = product.sizes && product.sizes.length > 0;
  const cheapestSize = hasSizes
    ? product.sizes.reduce((a, b) => (b.price < a.price ? b : a))
    : null;
  const priceRangeVaries =
    hasSizes && product.sizes.some((s) => s.price !== cheapestSize!.price);

  const hasPromo =
    !hasSizes &&
    product.promo_active &&
    product.promo_price != null &&
    product.promo_price < product.price;
  const displayPrice = cheapestSize
    ? cheapestSize.price
    : hasPromo
      ? product.promo_price!
      : product.price;

  const [showSizePicker, setShowSizePicker] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHoverCycle = () => {
    if (product.images.length <= 1) return;
    hoverTimer.current = setInterval(() => {
      setHoverIndex((i) => (i + 1) % product.images.length);
    }, HOVER_CYCLE_MS);
  };

  const stopHoverCycle = () => {
    if (hoverTimer.current) {
      clearInterval(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHoverIndex(0);
  };

  useEffect(() => () => stopHoverCycle(), []);

  const addToCart = (size?: { label: string; price: number }) => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: size ? size.price : displayPrice,
      sizeLabel: size ? size.label : product.size_label,
      image: product.images[0] || null,
    });
    setShowSizePicker(false);
  };

  const handleQuickAdd = () => {
    if (hasSizes) {
      setShowSizePicker((v) => !v);
    } else {
      addToCart();
    }
  };

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_-12px_rgba(74,46,24,0.25)]"
      onMouseEnter={startHoverCycle}
      onMouseLeave={stopHoverCycle}
    >
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-cream-dark"
      >
        {product.images.map((img, i) => (
          <Image
            key={img + i}
            src={img}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 40vw, 90vw"
            className={`object-cover transition-opacity duration-300 ${
              i === hoverIndex ? "opacity-100" : "opacity-0"
            }`}
            priority={i === 0}
          />
        ))}
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

        <div className="relative mt-auto flex items-center justify-between pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-brown-900">
              {priceRangeVaries ? `Desde ${formatPrice(displayPrice)}` : formatPrice(displayPrice)}
            </span>
            {hasPromo && (
              <span className="text-sm text-brown-800/40 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <button
            onClick={handleQuickAdd}
            aria-label={`Agregar ${product.name} al carrito`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brown-900 text-cream transition hover:bg-gold-500"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>

          {showSizePicker && hasSizes && (
            <>
              <button
                aria-label="Cerrar selector de tamaño"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setShowSizePicker(false)}
              />
              <div className="absolute bottom-full right-0 z-20 mb-2 w-44 rounded-xl border border-brown-900/10 bg-paper p-1.5 shadow-[0_10px_25px_rgba(74,46,24,0.2)]">
                <p className="px-2.5 py-1.5 text-xs font-medium text-brown-800/60">
                  Elegí el tamaño
                </p>
                {product.sizes.map((size) => (
                  <button
                    key={size.label}
                    onClick={() => addToCart(size)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-brown-900 hover:bg-cream-dark"
                  >
                    <span>{size.label}</span>
                    <span className="font-medium">{formatPrice(size.price)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
