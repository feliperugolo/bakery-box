import { createClient } from "@/lib/supabase/server";
import { seedCategories, seedProducts } from "@/lib/seed-data";
import {
  Category,
  DiscountCode,
  Order,
  Product,
  SiteSettings,
  WhatsappConversation,
  WhatsappMessage,
} from "@/lib/types";
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

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD en horario local
}

/**
 * Pedidos "por delante": sin fecha de entrega asignada todavía, o con fecha
 * de hoy en adelante. Es lo que necesita ver el equipo de cocina para armar
 * los pedidos. Una vez que pasa la fecha de entrega, el pedido deja de
 * aparecer acá y pasa al historial.
 */
export async function getUpcomingOrdersAdmin(): Promise<Order[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .or(`delivery_date.is.null,delivery_date.gte.${todayStr()}`)
    .order("delivery_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Order[];
}

/**
 * Historial: pedidos cuya fecha de entrega ya pasó. Por defecto trae los
 * últimos 30 días para no traer toda la tabla; se puede pedir un rango
 * puntual (from/to, formato YYYY-MM-DD) para buscar pedidos más viejos.
 */
export async function getOrderHistoryAdmin(range?: {
  from?: string;
  to?: string;
}): Promise<Order[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const today = todayStr();

  let from = range?.from;
  const to = range?.to && range.to < today ? range.to : today;
  if (!from) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    from = d.toLocaleDateString("en-CA");
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .lt("delivery_date", today)
    .gte("delivery_date", from)
    .lte("delivery_date", to)
    .order("delivery_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Order[];
}

export async function getAllDiscountCodesAdmin(): Promise<DiscountCode[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as DiscountCode[];
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

export async function getAllWhatsappConversationsAdmin(): Promise<WhatsappConversation[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  return data as WhatsappConversation[];
}

export async function getWhatsappMessagesAdmin(
  conversationId: string
): Promise<WhatsappMessage[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as WhatsappMessage[];
}
