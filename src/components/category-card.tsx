import Image from "next/image";
import Link from "next/link";
import { Category, Product } from "@/lib/types";

export default function CategoryCard({
  category,
  image,
}: {
  category: Category;
  image: string | null;
}) {
  return (
    <Link
      href={`/productos?categoria=${category.slug}`}
      className="group relative flex aspect-[4/5] overflow-hidden rounded-2xl bg-brown-900"
    >
      {image && (
        <Image
          src={image}
          alt={category.name}
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 80vw"
          className="object-cover opacity-80 transition duration-500 group-hover:scale-110 group-hover:opacity-70"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-brown-950/90 via-brown-950/10 to-transparent" />
      <span className="relative mt-auto p-5 font-display text-xl text-cream">
        {category.name}
      </span>
    </Link>
  );
}

export function pickCategoryImage(
  category: Category,
  products: Product[]
): string | null {
  if (category.image_url) return category.image_url;

  const match = products.find(
    (p) => p.category_id === category.id && p.images[0]
  );
  return match?.images[0] || null;
}
