"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Hero con una torta que se desplaza, rota y escala a medida que el usuario
 * scrollea. La sección mide 200vh: el primer 100vh es el "viaje" de la
 * torta y el contenido, después se asienta en su posición final.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const p = total > 0 ? -rect.top / total : 0;
        setProgress(Math.min(1, Math.max(0, p)));
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Curva de movimiento de la torta: ya está visible al entrar a la página
  // y se va desplazando, girando y acomodando a medida que se scrollea.
  const translateX = (1 - progress) * 34; // vw
  const translateY = (1 - progress) * 22; // vh
  const rotate = (1 - progress) * -18 + progress * 4; // grados
  const scale = 0.86 + progress * 0.24;

  const textTranslate = (1 - progress) * -16;

  const crumbOpacity = Math.min(1, Math.max(0, (progress - 0.5) * 2.5));

  return (
    <section
      ref={sectionRef}
      className="relative h-[200vh] bg-brown-950"
      aria-label="Presentación de Bakery Box"
    >
      <div className="sticky top-0 flex h-screen w-full items-center overflow-hidden">
        {/* Fondo */}
        <div className="absolute inset-0 bg-gradient-to-b from-brown-950 via-brown-900 to-brown-950" />
        <div className="bg-grain absolute inset-0 opacity-[0.15]" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />

        {/* Migas decorativas */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{ opacity: crumbOpacity }}
        >
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

        <div className="relative mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-8 px-5 md:flex-row md:justify-between md:gap-4 md:px-8">
          {/* Texto */}
          <div
            className="max-w-xl text-center md:text-left"
            style={{
              transform: `translateY(${textTranslate}px)`,
            }}
          >
            <span className="font-script text-3xl text-gold-300 md:text-4xl">
              Bienvenidos a
            </span>
            <h1 className="mt-1 font-display text-4xl leading-[1.05] text-cream sm:text-5xl md:text-6xl">
              Bakery Box
            </h1>
            <p className="mx-auto mt-5 max-w-md text-balance text-base leading-relaxed text-cream/75 md:mx-0 md:text-lg">
              Pastelería premium hecha a pedido: tortas, cheesecakes y
              postres artesanales para regalar o darte un gusto. Pedí online
              y coordinamos todo por WhatsApp.
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

          {/* Torta animada */}
          <div
            className="relative h-[260px] w-[260px] shrink-0 sm:h-[340px] sm:w-[340px] md:h-[420px] md:w-[420px]"
            style={{
              transform: `translate(${translateX}vw, ${translateY}vh) rotate(${rotate}deg) scale(${scale})`,
              willChange: "transform",
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gold-400/20 blur-2xl" />
            <Image
              src="/images/products/torta-mousse-chocolate-garrapinada.webp"
              alt="Torta mousse de chocolate con garrapiñada"
              fill
              sizes="(min-width: 768px) 420px, 300px"
              className="object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.45)]"
              priority
            />
          </div>
        </div>

        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/50 transition-opacity duration-500"
          style={{ opacity: 1 - progress * 2 < 0 ? 0 : 1 - progress * 2 }}
        >
          <div className="flex flex-col items-center gap-2 text-xs tracking-[0.2em]">
            SCROLL
            <span className="block h-8 w-px animate-pulse bg-cream/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
