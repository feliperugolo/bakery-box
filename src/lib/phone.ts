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
