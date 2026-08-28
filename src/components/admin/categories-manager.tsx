"use client";

import { useState } from "react";
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
import { GripVertical, Trash2, Eye, EyeOff, Plus, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function CategoriesManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: newName.trim(),
        slug: slugify(newName.trim()),
        position: categories.length,
      })
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data as Category]);
      setNewName("");
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Los productos quedarán sin categoría.")) return;
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  const toggleActive = async (cat: Category) => {
    const supabase = createClient();
    const newValue = !cat.active;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, active: newValue } : c))
    );
    await supabase.from("categories").update({ active: newValue }).eq("id", cat.id);
    router.refresh();
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const saveEdit = async (cat: Category) => {
    if (!editingName.trim()) return;
    const supabase = createClient();
    const updated = { name: editingName.trim(), slug: slugify(editingName.trim()) };
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, ...updated } : c))
    );
    await supabase.from("categories").update(updated).eq("id", cat.id);
    setEditingId(null);
    router.refresh();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((c, index) =>
        supabase.from("categories").update({ position: index }).eq("id", c.id)
      )
    );
    router.refresh();
  };

  return (
    <div>
      <div className="flex gap-2 rounded-2xl bg-paper p-4 shadow-[0_1px_3px_rgba(74,46,24,0.08)]">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nombre de la nueva categoría"
          className="flex-1 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-xl bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      <div className="mt-4">
        {categories.length === 0 ? (
          <p className="text-brown-800/60">Todavía no hay categorías.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2.5">
                {categories.map((cat) => (
                  <SortableCategoryRow
                    key={cat.id}
                    category={cat}
                    editing={editingId === cat.id}
                    editingName={editingName}
                    onEditingNameChange={setEditingName}
                    onStartEdit={() => startEdit(cat)}
                    onSaveEdit={() => saveEdit(cat)}
                    onCancelEdit={() => setEditingId(null)}
                    onToggleActive={() => toggleActive(cat)}
                    onDelete={() => handleDelete(cat.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableCategoryRow({
  category,
  editing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleActive,
  onDelete,
}: {
  category: Category;
  editing: boolean;
  editingName: string;
  onEditingNameChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-brown-800/40 hover:text-brown-800"
        aria-label="Reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {editing ? (
        <input
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
          autoFocus
          className="flex-1 rounded-lg border border-gold-400 bg-cream px-3 py-1.5 text-sm outline-none"
        />
      ) : (
        <span
          onClick={onStartEdit}
          className="flex-1 cursor-text font-medium text-brown-900"
        >
          {category.name}
        </span>
      )}

      {editing ? (
        <>
          <button
            onClick={onSaveEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-white"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onCancelEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-dark text-brown-800"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onToggleActive}
            title="Alternar visibilidad"
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              category.active
                ? "bg-brown-900 text-cream"
                : "bg-cream-dark text-brown-800/40"
            }`}
          >
            {category.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-dark text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </li>
  );
}
