"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  sizeLabel: string;
  image: string | null;
  quantity: number;
};

// Un mismo producto puede estar en el carrito más de una vez si se
// eligieron tamaños distintos (ej: Chico y Grande), así que la identidad
// de una línea del carrito es la combinación producto + tamaño, no solo
// el producto.
function lineKey(productId: string, sizeLabel: string) {
  return `${productId}::${sizeLabel}`;
}

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, sizeLabel: string) => void;
  setQuantity: (productId: string, sizeLabel: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item, quantity = 1) => {
        const items = get().items;
        const key = lineKey(item.productId, item.sizeLabel);
        const existing = items.find(
          (i) => lineKey(i.productId, i.sizeLabel) === key
        );
        if (existing) {
          set({
            items: items.map((i) =>
              lineKey(i.productId, i.sizeLabel) === key
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
        set({ isOpen: true });
      },
      removeItem: (productId, sizeLabel) => {
        const key = lineKey(productId, sizeLabel);
        set({
          items: get().items.filter((i) => lineKey(i.productId, i.sizeLabel) !== key),
        });
      },
      setQuantity: (productId, sizeLabel, quantity) => {
        const key = lineKey(productId, sizeLabel);
        if (quantity <= 0) {
          set({
            items: get().items.filter((i) => lineKey(i.productId, i.sizeLabel) !== key),
          });
          return;
        }
        set({
          items: get().items.map((i) =>
            lineKey(i.productId, i.sizeLabel) === key ? { ...i, quantity } : i
          ),
        });
      },
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: "bakery-box-cart",
      // Solo persistimos los productos del carrito. "isOpen" es estado de
      // interfaz (si el cajón está abierto o no) y no debe guardarse: si no,
      // el cajón podría aparecer abierto solo al volver a entrar al sitio.
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
