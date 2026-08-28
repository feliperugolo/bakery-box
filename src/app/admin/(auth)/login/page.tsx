"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : "Todavía no conectaste Supabase. Seguí las instrucciones del README para poder usar el panel."
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-cream-dark px-5">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-8 shadow-[0_1px_3px_rgba(74,46,24,0.1)]">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/brand/logo-badge.webp"
            alt="Bakery Box"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
          />
          <h1 className="mt-4 font-display text-2xl text-brown-900">
            Panel de administración
          </h1>
          <p className="mt-1 text-sm text-brown-800/60">
            Ingresá con tu usuario para gestionar productos, precios y pedidos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
              placeholder="admin@bakerybox.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brown-800">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-brown-900/15 bg-cream px-4 py-2.5 text-sm text-brown-900 outline-none focus:border-gold-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="mt-2 rounded-full bg-brown-900 py-3 text-sm font-semibold text-cream transition hover:bg-brown-800 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
