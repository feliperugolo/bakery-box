import DiscountCodesManager from "@/components/admin/discount-codes-manager";
import { getAllDiscountCodesAdmin } from "@/lib/data";

export default async function AdminDiscountsPage() {
  const codes = await getAllDiscountCodesAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Descuentos</h1>
      <p className="mt-1 text-brown-800/60">
        Creá códigos que tus clientes pueden usar en el carrito. Desactivalos
        cuando quieras sin perder el historial.
      </p>
      <div className="mt-8">
        <DiscountCodesManager initialCodes={codes} />
      </div>
    </div>
  );
}
