"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type HeroImage = {
  src: string;
  alt: string;
};

const FALLBACK_IMAGE: HeroImage = {
  src: "/images/products/torta-mousse-chocolate-garrapinada.webp",
  alt: "Bakery Box",
};

const SLIDE_INTERVAL_MS = 3000;

/**
 * Hero estático (sin efectos de scroll) con un marco circular donde van
 * pasando las fotos de los productos activos cada 3 segundos. La lista de
 * imágenes se arma en el servidor, así que apenas se suma un producto nuevo
 * con foto, se incorpora automáticamente a la rotación.
 */
export default function Hero({ images }: { images: HeroImage[] }) {
  const [index, setIndex] = useState(0);

  const slides = images.length > 0 ? images : [FALLBACK_IMAGE];

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  // Evita apuntar a un índice fuera de rango si la cantidad de imágenes
  // cambia (ej: se agregó un producto nuevo y se recargó la página).
  const activeIndex = index >= slides.length ? 0 : index;

  return (
    <section
      className="relative overflow-hidden bg-brown-950"
      aria-label="Presentación de Bakery Box"
    >
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-b from-brown-950 via-brown-900 to-brown-950" />
      <div className="bg-grain absolute inset-0 opacity-[0.15]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />

      {/* Migas decorativas */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[12%] top-[22%] h-2.5 w-2.5 animate-float-slow rounded-full bg-gold-400/70" />
        <span
          className="absolute left-[20%] top-[70%] h-2 w-2 animate-float-slow rounded-full bg-gold-300/60"
          style={{ animationDelay: "1s" }}
        />
        <span
          className="absolute right-[18%] top-[30%] h-3 w-3 animate-float-slow rounded-full bg-gold-400/50"
          style={{ animationDelay: "2s" }}
        />
        <span
          className="absolute right-[28%] top-[65%] h-2 w-2 animate-float-slow rounded-full bg-gold-300/70"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-10 px-5 py-16 md:flex-row md:justify-between md:gap-4 md:px-8 md:py-24">
        {/* Texto */}
        <div className="max-w-xl text-center md:text-left">
          <span className="font-script text-3xl text-gold-300 md:text-4xl">
            Bienvenidos a
          </span>
          <h1 className="mt-1 font-display text-4xl leading-[1.05] text-cream sm:text-5xl md:text-6xl">
            Bakery Box
          </h1>
          <p className="mx-auto mt-5 max-w-md text-balance text-base leading-relaxed text-cream/75 md:mx-0 md:text-lg">
            Pastelería premium. Ideal para hacer un regalo original o
            darte un gusto. Pedí online con 48hs de anticipación y
            coordinamos la entrega por WhatsApp.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start md:items-start">
            <Link
              href="/productos"
              className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-gold-500/20 transition hover:bg-gold-400"
            >
              Ver catálogo
            </Link>
            <a
              href="#destacados"
              className="rounded-full border border-cream/25 px-8 py-3.5 text-sm font-semibold tracking-wide text-cream transition hover:border-gold-300 hover:text-gold-300"
            >
              Productos destacados
            </a>
          </div>
        </div>

        {/* Marco circular con las fotos de los productos */}
        <div className="relative h-[240px] w-[240px] shrink-0 sm:h-[320px] sm:w-[320px] md:h-[380px] md:w-[380px]">
          <div className="absolute inset-0 rounded-full bg-gold-400/20 blur-2xl" />
          <div className="absolute inset-0 overflow-hidden rounded-full border-[6px] border-cream/10 shadow-[0_25px_45px_rgba(0,0,0,0.45)]">
            {slides.map((slide, i) => (
              <Image
                key={`${slide.src}-${i}`}
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(min-width: 768px) 380px, 300px"
                className={`object-cover transition-opacity duration-1000 ${
                  i === activeIndex ? "opacity-100" : "opacity-0"
                }`}
                priority={i === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
