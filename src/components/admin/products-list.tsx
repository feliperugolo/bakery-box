"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Eye, EyeOff, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Category, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function ProductsList({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || "Sin categoría";

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((p, index) =>
        supabase.from("products").update({ position: index }).eq("id", p.id)
      )
    );
    router.refresh();
  };

  const toggleField = async (product: Product, field: "active" | "promo_active") => {
    const supabase = createClient();
    const newValue = !product[field];
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, [field]: newValue } : p))
    );
    await supabase.from("products").update({ [field]: newValue }).eq("id", product.id);
    router.refresh();
  };

  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-paper p-10 text-center text-brown-800/60 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        Todavía no cargaste productos. Creá el primero con el botón de arriba.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2.5">
          {products.map((product) => (
            <SortableRow
              key={product.id}
              product={product}
              categoryName={categoryName(product.category_id)}
              onToggle={toggleField}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  product,
  categoryName,
  onToggle,
}: {
  product: Product;
  categoryName: string;
  onToggle: (product: Product, field: "active" | "promo_active") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-2xl bg-paper p-3 shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-brown-800/40 hover:text-brown-800"
        aria-label="Reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
        {product.images[0] && (
          <Image src={product.images[0]} alt="" fill sizes="56px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-brown-900">{product.name}</p>
        <p className="text-xs text-brown-800/50">{categoryName}</p>
      </div>

      <span className="hidden shrink-0 font-display text-brown-900 sm:block">
        {formatPrice(product.promo_active && product.promo_price ? product.promo_price : product.price)}
      </span>

      <button
        onClick={() => onToggle(product, "promo_active")}
        title="Alternar oferta"
        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex ${
          product.promo_active
            ? "bg-gold-500 text-white"
            : "bg-cream-dark text-brown-800/40"
        }`}
      >
        <Sparkles className="h-4 w-4" />
      </button>

      <button
        onClick={() => onToggle(product, "active")}
        title="Alternar visibilidad"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          product.active
            ? "bg-brown-900 text-cream"
            : "bg-cream-dark text-brown-800/40"
        }`}
      >
        {product.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>

      <Link
        href={`/admin/productos/${product.id}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-dark text-brown-800 hover:bg-gold-300/40"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Link>
    </li>
  );
}
