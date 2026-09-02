// Los pedidos solo se entregan de lunes a sábado (no domingos). Esta lista
// arma las próximas fechas disponibles para que el cliente elija el día de
// entrega en el carrito.
export type DeliveryDayOption = {
  value: string; // YYYY-MM-DD
  label: string; // ej: "Lunes 8 de septiembre"
};

const SUNDAY = 0;

export function getDeliveryDayOptions(count = 14): DeliveryDayOption[] {
  const options: DeliveryDayOption[] = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1); // el pedido de hoy no se entrega el mismo día

  while (options.length < count) {
    if (date.getDay() !== SUNDAY) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const value = `${year}-${month}-${day}`;
      const rawLabel = date.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      options.push({
        value,
        label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
      });
    }
    date.setDate(date.getDate() + 1);
  }

  return options;
}

export function formatDeliveryDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const rawLabel = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
}
