import Link from "next/link";
import Hero from "@/components/hero";
import SectionHeading from "@/components/section-heading";
import ProductCard from "@/components/product-card";
import CategoryCard, { pickCategoryImage } from "@/components/category-card";
import { getCategories, getFeaturedProducts, getProducts } from "@/lib/data";

export default async function Home() {
  const [categories, featured, allProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
    getProducts(),
  ]);

  const heroImages = allProducts
    .filter((p) => p.images[0])
    .map((p) => ({ src: p.images[0], alt: p.name }));

  return (
    <>
      <Hero images={heroImages} />

      <section id="destacados" className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <SectionHeading
          eyebrow="Lo más pedido"
          title="Productos destacados"
          description="Una selección de nuestras tortas y postres favoritos de la casa."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/productos"
            className="inline-block rounded-full border border-brown-900/20 px-8 py-3 text-sm font-semibold text-brown-900 transition hover:border-gold-500 hover:text-gold-500"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </section>

      <section className="bg-cream-dark py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <SectionHeading
            eyebrow="Elegí tu antojo"
            title="Categorías"
            description="Buscá por tipo de producto y encontrá justo lo que estás buscando."
          />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                image={pickCategoryImage(category, allProducts)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-24 text-center md:px-8">
        <span className="font-script text-3xl text-gold-500 md:text-4xl">
          Cómo funciona
        </span>
        <h2 className="mt-1 font-display text-3xl text-brown-900 sm:text-4xl">
          Pedir en Bakery Box es fácil
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Elegí tus productos",
              text: "Recorré el catálogo y agregá lo que quieras a tu carrito.",
            },
            {
              step: "2",
              title: "Elegí entrega y pago",
              text: "Retiro o delivery, transferencia o efectivo. Vos decidís.",
            },
            {
              step: "3",
              title: "Confirmamos por WhatsApp",
              text: "Enviamos tu pedido armado y coordinamos los detalles.",
            },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brown-900 font-display text-xl text-cream">
                {s.step}
              </span>
              <h3 className="font-display text-lg text-brown-900">{s.title}</h3>
              <p className="text-sm text-brown-800/70">{s.text}</p>
            </div>
          ))}
        </div>
        <Link
          href="/productos"
          className="mt-12 inline-block rounded-full bg-brown-900 px-9 py-3.5 text-sm font-semibold text-cream transition hover:bg-brown-800"
        >
          Empezar mi pedido
        </Link>
      </section>
    </>
  );
}
