export type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
  active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  size_label: string;
  price: number;
  promo_price: number | null;
  promo_active: boolean;
  images: string[];
  position: number;
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithCategory = Product & {
  categories: Pick<Category, "id" | "name" | "slug"> | null;
};

export type SiteSettings = {
  id: number;
  store_name: string;
  whatsapp_number: string;
  bank_alias: string;
  bank_cbu: string;
  bank_holder: string;
  bank_extra_note: string;
  delivery_note: string;
  pickup_address: string;
  instagram_url: string;
  updated_at: string;
};

export type DeliveryMethod = "retiro" | "delivery";
export type PaymentMethod = "transferencia" | "efectivo";

export type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  size_label: string;
};

export type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  delivery_method: DeliveryMethod;
  address: string;
  payment_method: PaymentMethod;
  items: OrderItem[];
  total: number;
  status: "nuevo" | "confirmado" | "entregado" | "cancelado";
  notes: string;
};
