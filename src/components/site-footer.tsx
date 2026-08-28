import Link from "next/link";
import Image from "next/image";
import { SiteSettings } from "@/lib/types";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="mt-24 border-t border-brown-900/10 bg-brown-950 text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3 md:px-8">
        <div>
          <Image
            src="/images/brand/logo-wordmark.webp"
            alt={settings.store_name}
            width={220}
            height={110}
            className="mb-4 h-auto w-40 rounded-md bg-cream p-2"
          />
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">
            Tortas, cheesecakes y postres artesanales hechos a pedido, con
            ingredientes seleccionados y mucho cariño.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-gold-300">Contacto</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream/75">
            <li>
              <a
                href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold-300"
              >
                WhatsApp: +{settings.whatsapp_number}
              </a>
            </li>
            {settings.pickup_address && <li>{settings.pickup_address}</li>}
            {settings.instagram_url && (
              <li>
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-gold-300"
                >
                  <InstagramIcon />
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg text-gold-300">Explorar</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream/75">
            <li>
              <Link href="/productos" className="hover:text-gold-300">
                Todo el catálogo
              </Link>
            </li>
            <li>
              <Link href="/carrito" className="hover:text-gold-300">
                Mi carrito
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {settings.store_name}. Hecho con amor y
        harina 🍰
      </div>
    </footer>
  );
}
