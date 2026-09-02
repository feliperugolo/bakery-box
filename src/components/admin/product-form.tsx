"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Category, Product, ProductSize } from "@/lib/types";
import ImageUploader from "./image-uploader";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [description, setDescription] = useState(product?.description || "");
  const [sizeLabel, setSizeLabel] = useState(product?.size_label || "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [promoPrice, setPromoPrice] = useState(
    product?.promo_price != null ? String(product.promo_price) : ""
  );
  const [promoActive, setPromoActive] = useState(product?.promo_active || false);
  const [sizes, setSizes] = useState<ProductSize[]>(product?.sizes || []);
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const addSizeRow = () => setSizes((prev) => [...prev, { label: "", price: 0 }]);

  const updateSizeRow = (index: number, patch: Partial<ProductSize>) =>
    setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const removeSizeRow = (index: number) =>
    setSizes((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim() || !price) {
      setError("Completá al menos nombre, slug y precio.");
      return;
    }

    const cleanSizes = sizes
      .map((s) => ({ label: s.label.trim(), price: Number(s.price) }))
      .filter((s) => s.label);

    if (sizes.length > 0 && cleanSizes.length !== sizes.length) {
      setError("Completá la etiqueta de todos los tamaños o eliminá los vacíos.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      name: name.trim(),
      slug: slugify(slug),
      category_id: categoryId || null,
      description: description.trim(),
      size_label: sizeLabel.trim(),
      price: Number(price),
      promo_price: promoPrice ? Number(promoPrice) : null,
      promo_active: promoActive,
      images,
      sizes: cleanSizes,
      active,
      featured,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("products").update(payload).eq("id", product!.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);

    if (dbError) {
      setError(
        dbError.message.includes("duplicate")
          ? "Ya existe un producto con ese slug. Elegí otro."
          : `No se pudo guardar: ${dbError.message}`
      );
      return;
    }

    router.push("/admin/productos");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`))
      return;

    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);
    router.push("/admin/productos");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="grid gap-5 rounded-2xl bg-paper p-6 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Nombre del producto
          </label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
            placeholder="Ej: Torta de chocolate"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Slug (URL)
          </label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
            placeholder="torta-de-chocolate"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Categoría
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Tamaño / porciones
          </label>
          <input
            value={sizeLabel}
            onChange={(e) => setSizeLabel(e.target.value)}
            className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
            placeholder="Ej: Torta entera - 10 a 12 porciones"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">
              Precio
            </label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">
              Precio promo (opcional)
            </label>
            <input
              type="number"
              min="0"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              placeholder="0"
            />
          </div>
        </div>
        {sizes.length > 0 && (
          <p className="-mt-2 text-xs text-brown-800/50">
            Si cargás tamaños abajo, el cliente elige entre ellos y estos
            precios de arriba no se usan.
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Tamaños (opcional, ej: Chico / Grande con precios distintos)
          </label>
          <div className="flex flex-col gap-2">
            {sizes.map((size, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={size.label}
                  onChange={(e) => updateSizeRow(i, { label: e.target.value })}
                  placeholder="Ej: Chico"
                  className="flex-1 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                />
                <input
                  type="number"
                  min="0"
                  value={size.price}
                  onChange={(e) =>
                    updateSizeRow(i, { price: Number(e.target.value) })
                  }
                  placeholder="Precio"
                  className="w-32 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
                />
                <button
                  type="button"
                  onClick={() => removeSizeRow(i)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-dark text-red-500 hover:bg-red-50"
                  aria-label="Eliminar tamaño"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSizeRow}
              className="flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-brown-900/25 px-4 py-2 text-sm font-medium text-brown-800 hover:border-gold-500 hover:text-gold-500"
            >
              <Plus className="h-4 w-4" /> Agregar tamaño
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brown-800">
            Fotos del producto
          </label>
          <ImageUploader images={images} onChange={setImages} />
        </div>

        <div className="flex flex-wrap gap-6 border-t border-brown-900/10 pt-4">
          <Toggle label="Producto activo" checked={active} onChange={setActive} />
          <Toggle
            label="Destacado en portada"
            checked={featured}
            onChange={setFeatured}
          />
          <Toggle
            label="Oferta activa"
            checked={promoActive}
            onChange={setPromoActive}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between border-t border-brown-900/10 pt-5">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Eliminar producto
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brown-900 px-8 py-3 text-sm font-semibold text-cream transition hover:bg-brown-800 disabled:opacity-60"
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-gold-500" : "bg-brown-900/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
      <span className="text-sm text-brown-800">{label}</span>
    </label>
  );
}
