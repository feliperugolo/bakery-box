import type { Metadata } from "next";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/800.css";
import "@fontsource/alex-brush/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bakery Box | Pastelería premium a pedido",
  description:
    "Tortas, cheesecakes y postres artesanales hechos a pedido en Bakery Box by Lunch Box. Pedí online, pagá por transferencia o efectivo, retirá o recibí por delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream">{children}</body>
    </html>
  );
}
