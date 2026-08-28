import { createClient } from "@/lib/supabase/server";
import { seedCategories, seedProducts } from "@/lib/seed-data";
import { Category, Order, Product, SiteSettings } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export { isSupabaseConfigured };

const defaultSettings: SiteSettings = {
  id: 1,
  store_name: "Bakery Box",
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491162797363",
  bank_alias: "",
  bank_cbu: "",
  bank_holder: "",
  bank_extra_note: "",
  delivery_note: "Coordinamos el costo y la zona de envío por WhatsApp.",
  pickup_address: "",
  instagram_url: "",
  updated_at: new Date().toISOString(),
};

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return seedCategories;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });

  if (error || !data) return seedCategories;
  return data as Category[];
}

export async function getAllCategoriesAdmin(): Promise<Category[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data as Category[];
}

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return seedProducts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });

  if (error || !data) return seedProducts;
  return data as Product[];
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    return seedProducts.find((p) => p.slug === slug) || null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Product;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();
  const featured = products.filter((p) => p.featured);
  return featured.length > 0 ? featured : products.slice(0, 4);
}

export async function getProductByIdAdmin(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Product;
}

export async function getAllOrdersAdmin(limit?: number): Promise<Order[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Order[];
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured) return defaultSettings;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return defaultSettings;
  return data as SiteSettings;
}
