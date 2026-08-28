import CartPageClient from "@/components/cart-page-client";
import { getSiteSettings } from "@/lib/data";

export const metadata = {
  title: "Tu carrito | Bakery Box",
};

export default async function CarritoPage() {
  const settings = await getSiteSettings();
  return <CartPageClient settings={settings} />;
}
