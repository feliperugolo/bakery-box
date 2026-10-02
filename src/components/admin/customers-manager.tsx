"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Gift, Plus, UserX, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Customer, DiscountType, Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { phoneNumbersMatch } from "@/lib/phone";

function AddCustomerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, phone: string) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Ingresá el nombre.");
      return;
    }
    if (!phone.trim()) {
      setError("Ingresá el teléfono.");
      return;
    }
    setSaving(true);
    const err = await onCreate(name.trim(), phone.trim());
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-brown-900">Agendar cliente</h3>
          <button onClick={onClose} className="text-brown-800/50 hover:text-red-600" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">
              Teléfono (con código de país)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
              placeholder="5491122334455"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            {saving ? "Guardando..." : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateBenefitModal({
  customer,
  onClose,
  onCreated,
}: {
  customer: Customer;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const codeValue = code.trim().toUpperCase();
    const numValue = Number(value);
    if (!codeValue) {
      setError("Ingresá un código.");
      return;
    }
    if (!numValue || numValue <= 0) {
      setError("Ingresá un valor mayor a 0.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("discount_codes").insert({
      code: codeValue,
      type,
      value: numValue,
      active: true,
      customer_phone: customer.phone,
    });
    setSaving(false);
    if (dbError) {
      setError(
        dbError.message.includes("duplicate")
          ? "Ya existe un código con ese nombre."
          : `No se pudo guardar: ${dbError.message}`
      );
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-brown-900">
            Beneficio para {customer.name}
          </h3>
          <button onClick={onClose} className="text-brown-800/50 hover:text-red-600" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-brown-800/60">
          Este código solo lo va a poder usar {customer.name}, con el número{" "}
          {customer.phone} — ni por la página ni por WhatsApp funciona para
          otro cliente.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">Código</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: GRACIAS10"
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
              className="rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="percent">% Porcentaje</option>
              <option value="fixed">$ Monto fijo</option>
            </select>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "percent" ? "Ej: 10" : "Ej: 5000"}
              className="flex-1 rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brown-900 hover:brightness-95 disabled:opacity-60"
          >
            <Gift className="h-3.5 w-3.5" />
            {saving ? "Guardando..." : "Crear beneficio"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersManager({
  initialCustomers,
  allOrders,
}: {
  initialCustomers: Customer[];
  allOrders: Order[];
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [benefitFor, setBenefitFor] = useState<Customer | null>(null);

  const createCustomer = async (name: string, phone: string): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({ name, phone, notes: "" })
      .select()
      .single();
    if (error) return `No se pudo guardar: ${error.message}`;
    if (data) {
      setCustomers((prev) => [data as Customer, ...prev]);
      router.refresh();
    }
    return null;
  };

  const deleteCustomer = async (customer: Customer) => {
    if (!confirm(`¿Quitar a ${customer.name} de la agenda? Sus pedidos no se borran.`)) return;
    const supabase = createClient();
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    await supabase.from("customers").delete().eq("id", customer.id);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-brown-800/60">
          {customers.length === 0
            ? "Todavía no agendaste clientes."
            : `${customers.length} cliente${customers.length === 1 ? "" : "s"} agendado${
                customers.length === 1 ? "" : "s"
              }`}
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brown-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-brown-800"
        >
          <Plus className="h-4 w-4" /> Agendar cliente
        </button>
      </div>

      {customers.length === 0 ? (
        <p className="text-brown-800/60">
          Agendá un cliente a mano o simplemente esperá: cuando alguien hace
          un pedido queda disponible para buscarlo acá por teléfono.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {customers.map((customer) => {
            const orders = allOrders.filter((o) =>
              phoneNumbersMatch(o.customer_phone, customer.phone)
            );
            const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
            const isRecurring = orders.length >= 2;
            const open = openId === customer.id;

            return (
              <li
                key={customer.id}
                className="rounded-2xl bg-paper shadow-[0_1px_3px_rgba(74,46,24,0.08)]"
              >
                <button
                  onClick={() => setOpenId(open ? null : customer.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-brown-900">{customer.name}</p>
                      {isRecurring && (
                        <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                          Recurrente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brown-800/50">
                      {customer.phone} · {orders.length} pedido
                      {orders.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-brown-900">
                      {formatPrice(totalSpent)}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-brown-800/50 transition ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-brown-900/10 p-4">
                    {customer.notes && (
                      <p className="mb-3 text-sm text-brown-800/70">
                        <span className="font-medium">Notas:</span> {customer.notes}
                      </p>
                    )}

                    {orders.length === 0 ? (
                      <p className="mb-3 text-sm text-brown-800/50">
                        Todavía no tiene pedidos registrados con este teléfono.
                      </p>
                    ) : (
                      <ul className="mb-3 flex flex-col gap-1.5 text-sm text-brown-800/80">
                        {orders.map((o) => (
                          <li key={o.id} className="flex items-center justify-between gap-2">
                            <span>
                              {new Date(o.created_at).toLocaleDateString("es-AR")} ·{" "}
                              {o.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                            </span>
                            <span className="shrink-0 font-medium">{formatPrice(o.total)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setBenefitFor(customer)}
                        className="flex items-center gap-1.5 rounded-full bg-gold-500 px-3.5 py-1.5 text-xs font-medium text-brown-900 hover:brightness-95"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        Crear beneficio
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer)}
                        className="flex items-center gap-1.5 rounded-full bg-cream-dark px-3.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Quitar de la agenda
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showAddModal && (
        <AddCustomerModal onClose={() => setShowAddModal(false)} onCreate={createCustomer} />
      )}
      {benefitFor && (
        <CreateBenefitModal
          customer={benefitFor}
          onClose={() => setBenefitFor(null)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  );
}
