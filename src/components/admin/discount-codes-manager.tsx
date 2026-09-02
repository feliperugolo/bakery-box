"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DiscountCode, DiscountType } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function DiscountCodesManager({
  initialCodes,
}: {
  initialCodes: DiscountCode[];
}) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<DiscountType>("percent");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setError(null);
    const code = newCode.trim().toUpperCase();
    const value = Number(newValue);

    if (!code) {
      setError("Ingresá un código.");
      return;
    }
    if (!value || value <= 0) {
      setError("Ingresá un valor mayor a 0.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("discount_codes")
      .insert({ code, type: newType, value, active: true })
      .select()
      .single();

    setSaving(false);

    if (dbError) {
      setError(
        dbError.message.includes("duplicate")
          ? "Ya existe un código con ese nombre."
          : `No se pudo guardar: ${dbError.message}`
      );
      return;
    }

    if (data) {
      setCodes([data as DiscountCode, ...codes]);
      setNewCode("");
      setNewValue("");
      router.refresh();
    }
  };

  const toggleActive = async (item: DiscountCode) => {
    const supabase = createClient();
    const newActive = !item.active;
    setCodes((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, active: newActive } : c))
    );
    await supabase.from("discount_codes").update({ active: newActive }).eq("id", item.id);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este código de descuento?")) return;
    const supabase = createClient();
    await supabase.from("discount_codes").delete().eq("id", id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col gap-2 rounded-2xl bg-paper p-4 shadow-[0_1px_3px_rgba(74,46,24,0.08)] sm:flex-row sm:items-center">
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          placeholder="Código (ej: BIENVENIDA10)"
          className="flex-1 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as DiscountType)}
          className="rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
        >
          <option value="percent">% Porcentaje</option>
          <option value="fixed">$ Monto fijo</option>
        </select>
        <input
          type="number"
          min="0"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={newType === "percent" ? "Ej: 10" : "Ej: 5000"}
          className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500 sm:w-32"
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Crear
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {codes.length === 0 ? (
          <p className="text-brown-800/60">Todavía no creaste códigos de descuento.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {codes.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brown-900">{item.code}</p>
                  <p className="text-xs text-brown-800/50">
                    {item.type === "percent"
                      ? `${item.value}% de descuento`
                      : `${formatPrice(item.value)} de descuento`}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(item)}
                  title="Alternar activo"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    item.active
                      ? "bg-brown-900 text-cream"
                      : "bg-cream-dark text-brown-800/40"
                  }`}
                >
                  {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-dark text-red-500 hover:bg-red-50"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
