"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Category } from "@/lib/types";
import { useCartStore, cartCount } from "@/lib/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";

export default function SiteHeader({
  categories,
  storeName,
}: {
  categories: Category[];
  storeName: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mounted = useHasMounted();
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = mounted ? cartCount(items) : 0;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-cream/95 backdrop-blur shadow-[0_2px_16px_rgba(74,46,24,0.08)]"
          : "bg-cream/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/brand/logo-badge.webp"
            alt={storeName}
            width={48}
            height={48}
            className="h-11 w-11 rounded-full object-cover md:h-12 md:w-12"
            priority
          />
          <span className="font-display text-xl tracking-wide text-brown-900 md:text-2xl">
            {storeName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/productos"
            className="text-sm font-medium tracking-wide text-brown-800 transition hover:text-gold-500"
          >
            Todo el catálogo
          </Link>
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?categoria=${cat.slug}`}
              className="text-sm font-medium tracking-wide text-brown-800 transition hover:text-gold-500"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={openCart}
            aria-label="Ver carrito"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-brown-800/15 bg-paper text-brown-900 transition hover:border-gold-400 hover:text-gold-500"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[11px] font-semibold text-cream">
                {count}
              </span>
            )}
          </button>

          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-brown-900 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? (
              <X className="h-6 w-6" strokeWidth={1.75} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-brown-900/10 bg-cream px-5 pb-4 pt-2 md:hidden">
          <Link
            href="/productos"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-brown-800 hover:bg-cream-dark"
            onClick={() => setMobileOpen(false)}
          >
            Todo el catálogo
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?categoria=${cat.slug}`}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-brown-800 hover:bg-cream-dark"
              onClick={() => setMobileOpen(false)}
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
