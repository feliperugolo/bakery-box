"use client";

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor">
      <path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.4.7 4.63 1.9 6.5L4 29l7.66-1.86a11.94 11.94 0 0 0 4.36.82h.01c6.62 0 12.02-5.4 12.02-12.02C28.05 8.4 22.65 3 16.02 3zm0 21.86h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-4.55 1.1 1.21-4.44-.24-.46a9.86 9.86 0 0 1-1.51-5.24c0-5.45 4.44-9.9 9.91-9.9 2.65 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7.01c0 5.46-4.45 9.63-9.3 9.63zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}

export default function WhatsappFloatButton({
  phone,
  message = "¡Hola! Tengo una consulta sobre sus productos 🍰",
}: {
  phone: string;
  message?: string;
}) {
  const href = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 active:scale-95 md:bottom-7 md:right-7"
    >
      <WhatsappIcon />
    </a>
  );
}
