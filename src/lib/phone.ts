/**
 * Comparar números de teléfono es más delicado de lo que parece: el mismo
 * cliente puede aparecer con formatos distintos según de dónde salga el
 * número. El del checkout de la página es lo que el cliente tipeó a mano
 * (ej: "11 2233-4455", sin código de país). El de WhatsApp (webhook) viene
 * siempre en formato internacional completo (ej: "5491122334455", con el
 * "9" de celular que agrega Meta). Compararlos tal cual nunca da igual aunque
 * sean la misma persona — por eso comparamos solo los últimos dígitos.
 */

export function normalizePhoneDigits(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

/**
 * true si ambos números, una vez limpiados de todo lo que no sea dígito,
 * terminan igual en al menos los últimos 8 dígitos (suficiente para
 * identificar un celular local sin depender del código de país / el 9 de
 * celular, que varían según el origen del número).
 */
export function phoneNumbersMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (da.length < 8 || db.length < 8) return false;

  const tailLength = Math.min(8, da.length, db.length);
  return da.slice(-tailLength) === db.slice(-tailLength);
}

/**
 * El negocio opera solo en Argentina, así que cuando alguien tipea un
 * número a mano (ej: para mandarle una plantilla a un contacto nuevo) casi
 * siempre lo escribe en formato local, sin "+54" ni el "9" de celular que
 * WhatsApp agrega automáticamente. Si no normalizamos esto antes de guardar
 * la conversación, el mismo cliente puede terminar con dos conversaciones
 * distintas: una con el formato que mandó Meta por el webhook y otra con el
 * que tipeó el admin (esto pasó en la práctica, ver "Felipe" / "Felipe
 * Rugolo"). Si el número ya trae otro código de país, se deja intacto.
 */
export function toWhatsappPhone(raw: string): string {
  let digits = normalizePhoneDigits(raw);
  if (!digits) return digits;

  if (digits.startsWith("54")) {
    const rest = digits.slice(2).replace(/^9/, "");
    return `549${rest}`;
  }

  // Sin código de país: asumimos Argentina. Sacamos un 0 de discado local
  // inicial si está (ej: "011..." -> "11...").
  digits = digits.replace(/^0/, "");
  return `549${digits}`;
}
