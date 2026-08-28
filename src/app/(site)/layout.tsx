import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CartDrawer from "@/components/cart-drawer";
import WhatsappFloatButton from "@/components/whatsapp-float-button";
import { getCategories, getSiteSettings } from "@/lib/data";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings] = await Promise.all([
    getCategories(),
    getSiteSettings(),
  ]);

  return (
    <>
      <SiteHeader categories={categories} storeName={settings.store_name} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <CartDrawer />
      <WhatsappFloatButton phone={settings.whatsapp_number} />
    </>
  );
}
