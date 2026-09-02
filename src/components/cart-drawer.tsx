"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore, cartTotal } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { useHasMounted } from "@/lib/use-has-mounted";

export default function CartDrawer() {
  const mounted = useHasMounted();
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const total = cartTotal(items);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Cerrar carrito"
        className="absolute inset-0 bg-brown-950/50 backdrop-blur-[1px]"
        onClick={close}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-paper shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between border-b border-brown-900/10 px-5 py-4">
          <h2 className="font-display text-xl text-brown-900">Tu carrito</h2>
          <button
            onClick={close}
            aria-label="Cerrar"
            className="rounded-full p-2 text-brown-800 hover:bg-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="h-12 w-12 text-brown-800/30" strokeWidth={1.25} />
            <p className="text-brown-800/70">Todavía no agregaste productos.</p>
            <Link
              href="/productos"
              onClick={close}
              className="mt-2 rounded-full bg-brown-900 px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-brown-800"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li
                    key={`${item.productId}::${item.sizeLabel}`}
                    className="flex gap-3 border-b border-brown-900/10 pb-4"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-brown-900">
                          {item.name}
                        </p>
                        <button
                          onClick={() => removeItem(item.productId, item.sizeLabel)}
                          aria-label="Quitar"
                          className="shrink-0 text-brown-800/40 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.sizeLabel && (
                        <p className="text-xs text-brown-800/60">{item.sizeLabel}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-full border border-brown-900/15 px-1">
                          <button
                            className="flex h-7 w-7 items-center justify-center text-brown-800"
                            onClick={() =>
                              setQuantity(item.productId, item.sizeLabel, item.quantity - 1)
                            }
                            aria-label="Restar"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center text-sm">
                            {item.quantity}
                          </span>
                          <button
                            className="flex h-7 w-7 items-center justify-center text-brown-800"
                            onClick={() =>
                              setQuantity(item.productId, item.sizeLabel, item.quantity + 1)
                            }
                            aria-label="Sumar"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-brown-900">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-brown-900/10 px-5 py-5">
              <div className="mb-4 flex items-center justify-between text-base">
                <span className="text-brown-800">Total</span>
                <span className="text-2xl font-semibold text-brown-900">
                  {formatPrice(total)}
                </span>
              </div>
              <Link
                href="/carrito"
                onClick={close}
                className="block w-full rounded-full bg-gold-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-gold-400"
              >
                Finalizar pedido
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
