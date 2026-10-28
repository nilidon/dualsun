export type OrderStatus = "placed" | "prepared" | "shipped" | "delivered" | "on_hold" | "refunded";

/** Shippo tracking → the next order status. Prepared is the only handoff she makes. */
export function statusAfterCarrier(
  current: OrderStatus,
  carrierStatus: string,
  substatus: string | null,
): "shipped" | "delivered" | "on_hold" | null {
  if (current === "refunded" || current === "delivered") return null;
  const status = carrierStatus.trim().toUpperCase();
  const sub = (substatus ?? "").trim().toLowerCase();

  if (status === "FAILURE" || status === "RETURNED") {
    if (current === "on_hold" || current === "placed") return null;
    return "on_hold";
  }

  const delivered = status === "DELIVERED";
  const accepted = status === "PRE_TRANSIT" && sub === "package_accepted";
  const inTransit = status === "TRANSIT" || accepted;
  if (!delivered && !inTransit) return null;
  if (current !== "prepared" && current !== "shipped") return null;
  if (delivered) return "delivered";
  if (current === "prepared") return "shipped";
  return null;
}
