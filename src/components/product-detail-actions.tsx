"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { Product } from "@/lib/types";

export default function ProductDetailActions({ product }: { product: Product }) {
  const hasSizes = product.sizes && product.sizes.length > 0;
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const hasPromo =
    !hasSizes &&
    product.promo_active &&
    product.promo_price != null &&
    product.promo_price < product.price;

  const selectedSize = hasSizes ? product.sizes[selectedSizeIndex] : null;
  const displayPrice = selectedSize ? selectedSize.price : hasPromo ? product.promo_price! : product.price;
  const sizeLabel = selectedSize ? selectedSize.label : product.size_label;

  const handleAdd = () => {
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: displayPrice,
        sizeLabel,
        image: product.images[0] || null,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="mt-8 flex flex-col gap-5">
      {hasSizes && (
        <div>
          <p className="mb-2 text-sm font-medium text-brown-800">Tamaño</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size, i) => (
              <button
                key={size.label}
                onClick={() => setSelectedSizeIndex(i)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  i === selectedSizeIndex
                    ? "border-gold-500 bg-gold-500/10 text-brown-900"
                    : "border-brown-900/15 text-brown-800/70"
                }`}
              >
                {size.label} · {formatPrice(size.price)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center gap-3 rounded-full border border-brown-900/15 px-2 py-1.5 sm:justify-start">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brown-800 hover:bg-cream-dark"
            aria-label="Restar cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center font-medium text-brown-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brown-800 hover:bg-cream-dark"
            aria-label="Sumar cantidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brown-900 px-8 py-3.5 text-sm font-semibold text-cream transition hover:bg-gold-500"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Agregado al carrito
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" /> Agregar al carrito
            </>
          )}
        </button>
      </div>
    </div>
  );
}
