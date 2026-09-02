const WHATSAPP_MAYORISTA = "5491125063003";

export const metadata = {
  title: "Mayorista | Bakery Box",
};

export default function MayoristaPage() {
  const message = "¡Hola! Quiero armar una propuesta mayorista para mi negocio.";
  const href = `https://wa.me/${WHATSAPP_MAYORISTA}?text=${encodeURIComponent(message)}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 text-center md:px-8 md:py-24">
      <span className="font-script text-3xl text-gold-500 md:text-4xl">
        Para tu negocio
      </span>
      <h1 className="mt-1 font-display text-3xl text-brown-900 sm:text-4xl">
        Mayorista
      </h1>

      <div className="mx-auto mt-8 max-w-xl space-y-5 text-center leading-relaxed text-brown-800/80 sm:text-lg">
        <p>
          ¿Tenés una cafetería, restaurante o emprendimiento gastronómico y
          querés elevar el nivel de tu propuesta dulce?
        </p>
        <p>
          En Bakery Box elaboramos pastelería premium para negocios, con
          opciones pensadas especialmente para tu carta y la posibilidad de
          desarrollar postres a medida.
        </p>
        <p>
          Contactanos y armamos una propuesta mayorista personalizada según
          las necesidades de tu negocio.
        </p>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-95"
      >
        Escribinos por WhatsApp mayorista
      </a>
      <p className="mt-3 text-sm text-brown-800/50">
        WhatsApp mayorista: +{WHATSAPP_MAYORISTA}
      </p>
    </div>
  );
}
