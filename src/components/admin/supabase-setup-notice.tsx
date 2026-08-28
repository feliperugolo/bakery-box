import Image from "next/image";

export default function SupabaseSetupNotice() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-cream-dark px-5">
      <div className="max-w-md rounded-2xl bg-paper p-8 text-center shadow-[0_1px_3px_rgba(74,46,24,0.1)]">
        <Image
          src="/images/brand/logo-badge.webp"
          alt="Bakery Box"
          width={56}
          height={56}
          className="mx-auto h-14 w-14 rounded-full"
        />
        <h1 className="mt-4 font-display text-2xl text-brown-900">
          Conectá Supabase para usar el panel
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-brown-800/70">
          El sitio ya está funcionando con productos de muestra, pero para
          usar el panel de administrador (login, cargar productos, pedidos)
          necesitás conectar tu proyecto de Supabase. Seguí los pasos del
          archivo <code className="rounded bg-cream px-1.5 py-0.5">README.md</code>{" "}
          del proyecto: creá el proyecto, corré{" "}
          <code className="rounded bg-cream px-1.5 py-0.5">supabase/schema.sql</code>{" "}
          y completá las variables de entorno.
        </p>
      </div>
    </div>
  );
}
