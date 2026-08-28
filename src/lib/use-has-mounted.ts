"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Devuelve `false` durante el render en el servidor (y el primer render en
 * cliente, para que coincida con la hidratación) y `true` después de
 * hidratar. Se usa para renderizar cosas que dependen de estado guardado en
 * el navegador (como el carrito en localStorage) sin generar errores de
 * hidratación ni disparar un setState manual dentro de un efecto.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
