import Stripe from "stripe";
import { statusAfterCarrier, type OrderStatus } from "./carrier-status";
import {
  claimLabelPurchase,
  getOrder,
  getOrderByPaymentIntent,
  getOrderBySession,
  getOrderByTracking,
  insertOrder,
  listOrders,
  ordersWithTracking,
  releaseLabelClaim,
  saveOrder,
  type OrderRow,
} from "./db";
import { buyLabel, shippoConfigured, trackingStatus } from "./shippo";

export type PublicOrder = {
  id: number;
  status: OrderStatus;
  quantity: number;
  amountCents: number;
  currency: string;
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  heard: string;
  labelUrl: string;
  labelError: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  service: string;
  postageCents: number;
  holdKind: string;
  holdDetail: string;
  refundCents: number;
  createdAt: string;
  preparedAt: string;
  shippedAt: string;
  deliveredAt: string;
};

const HOLD_TABS = new Set<OrderStatus>(["on_hold", "refunded"]);

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) return null;
  return new Stripe(key);
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

export function toPublic(order: OrderRow): PublicOrder {
  return {
    id: order.id,
    status: order.status,
    quantity: order.quantity,
    amountCents: order.amount_cents,
    currency: order.currency,
    name: order.customer_name,
    email: order.customer_email,
    phone: order.customer_phone,
    line1: order.line1,
    line2: order.line2,
    city: order.city,
    state: order.state,
    postalCode: order.postal_code,
    country: order.country,
    heard: order.heard,
    labelUrl: order.label_url,
    labelError: order.label_error,
    trackingNumber: order.tracking_number,
    trackingUrl: order.tracking_url,
    carrier: order.carrier,
    service: order.service_level,
    postageCents: order.postage_cents,
    holdKind: order.hold_kind,
    holdDetail: order.hold_detail,
    refundCents: order.refund_cents,
    createdAt: order.created_at,
    preparedAt: order.prepared_at,
    shippedAt: order.shipped_at,
    deliveredAt: order.delivered_at,
  };
}

function paymentIntentId(value: string | Stripe.PaymentIntent | null) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

function text(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export async function recordPaidSession(sessionId: string) {
  const existing = getOrderBySession(sessionId);
  if (existing) return { ok: true as const, order: existing };
  const stripe = stripeClient();
  if (!stripe) return { ok: false as const, error: "Stripe is not connected yet." };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items", "payment_intent"] });
  } catch {
    return { ok: false as const, error: "Stripe could not find that payment." };
  }
  if (session.payment_status !== "paid") return { ok: false as const, error: "This payment is not complete." };

  const again = getOrderBySession(session.id);
  if (again) return { ok: true as const, order: again };

  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const line = session.line_items?.data[0];
  const quantity = line?.quantity && line.quantity > 0 ? line.quantity : 1;
  const heard = session.custom_fields?.find((field) => field.key === "heard");
  const heardValue = heard && "dropdown" in heard ? text(heard.dropdown?.value) : "";

  const order = insertOrder({
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId(session.payment_intent),
    quantity,
    amountCents: session.amount_total ?? quantity * 4000,
    currency: session.currency ?? "usd",
    customerName: text(shipping?.name) || text(session.customer_details?.name),
    customerEmail: text(session.customer_details?.email),
    customerPhone: text(session.customer_details?.phone),
    line1: text(address?.line1),
    line2: text(address?.line2),
    city: text(address?.city),
    state: text(address?.state),
    postalCode: text(address?.postal_code),
    country: text(address?.country),
    heard: heardValue,
  });
  if (!order) return { ok: false as const, error: "The order could not be saved." };
  return { ok: true as const, order };
}

function hold(order: OrderRow, kind: string, detail: string, extra: Partial<OrderRow> = {}) {
  if (order.status === "refunded") return getOrder(order.id);
  const before = order.status === "on_hold" ? order.status_before_hold : order.status;
  return saveOrder(order.id, {
    status: "on_hold",
    status_before_hold: before,
    hold_kind: kind,
    hold_detail: detail,
    ...extra,
  });
}

function restore(order: OrderRow) {
  if (order.status !== "on_hold") return order;
  const previous = order.status_before_hold;
  const next: OrderStatus =
    previous === "prepared" || previous === "shipped" || previous === "delivered" || previous === "placed"
      ? previous
      : "placed";
  return (
    saveOrder(order.id, {
      status: next,
      status_before_hold: "",
      hold_kind: "",
      hold_detail: "",
      stripe_dispute_id: "",
      stripe_review_id: "",
    }) ?? order
  );
}

function markRefunded(order: OrderRow, cents: number, detail: string) {
  return saveOrder(order.id, {
    status: "refunded",
    hold_kind: "refund",
    hold_detail: detail,
    refund_cents: Math.max(order.refund_cents, cents),
  });
}

export function applyCarrierUpdate(trackingNumber: string, carrierStatus: string, substatus: string | null) {
  const order = getOrderByTracking(trackingNumber);
  if (!order) return;
  const next = statusAfterCarrier(order.status, carrierStatus, substatus);
  if (!next || next === order.status) return;
  const now = new Date().toISOString();
  if (next === "on_hold") {
    const detail = carrierStatus.toUpperCase() === "RETURNED" ? "The carrier returned this package." : "The carrier reported a delivery problem.";
    hold(order, "carrier", detail);
    return;
  }
  saveOrder(order.id, {
    status: next,
    shipped_at: next === "shipped" || (next === "delivered" && !order.shipped_at) ? now : order.shipped_at,
    delivered_at: next === "delivered" ? now : order.delivered_at,
  });
}

export async function syncTracking() {
  if (!shippoConfigured()) return;
  const orders = ordersWithTracking(["prepared", "shipped"]);
  for (const order of orders) {
    const live = await trackingStatus(order.carrier || "USPS", order.tracking_number);
    if (!live.ok) continue;
    applyCarrierUpdate(order.tracking_number, live.status, live.substatus);
  }
}

function intentOf(value: string | Stripe.PaymentIntent | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

const OPEN_DISPUTE = new Set(["needs_response", "under_review", "warning_needs_response", "warning_under_review"]);
const WON_DISPUTE = new Set(["won", "warning_closed", "prevented"]);

export async function syncStripe() {
  const stripe = stripeClient();
  if (!stripe) return;
  const warnings: string[] = [];

  try {
    const refunds = await stripe.refunds.list({ limit: 100 });
    for (const refund of refunds.data) {
      const order = getOrderByPaymentIntent(intentOf(refund.payment_intent));
      if (!order) continue;
      const refundStatus = String(refund.status ?? "");
      if (refundStatus === "succeeded") {
        markRefunded(order, refund.amount, refund.amount >= order.amount_cents ? "Refunded in Stripe." : "Partly refunded in Stripe.");
      } else if (refundStatus === "pending") {
        hold(order, "refund", "A refund is pending in Stripe.", { refund_cents: Math.max(order.refund_cents, refund.amount) });
      } else if ((refundStatus === "failed" || refundStatus === "canceled") && order.hold_kind === "refund" && order.status === "on_hold") {
        restore(order);
      }
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Stripe refunds could not be read.");
  }

  try {
    const disputes = await stripe.disputes.list({ limit: 100 });
    for (const dispute of disputes.data) {
      const order = getOrderByPaymentIntent(intentOf(dispute.payment_intent));
      if (!order || order.status === "refunded") continue;
      const reason = dispute.reason ? dispute.reason.replaceAll("_", " ") : "dispute";
      const disputeStatus = String(dispute.status ?? "");
      if (OPEN_DISPUTE.has(disputeStatus)) {
        hold(order, "dispute", `Stripe dispute: ${reason}.`, { stripe_dispute_id: dispute.id });
      } else if (disputeStatus === "lost") {
        markRefunded(order, dispute.amount, "Stripe dispute was lost.");
      } else if (WON_DISPUTE.has(disputeStatus) && order.hold_kind === "dispute" && order.stripe_dispute_id === dispute.id) {
        restore(order);
      }
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Stripe disputes could not be read.");
  }

  try {
    const reviews = await stripe.reviews.list({ limit: 100 });
    const openReviewIds = new Set(reviews.data.map((review) => review.id));
    for (const review of reviews.data) {
      const order = getOrderByPaymentIntent(intentOf(review.payment_intent));
      if (!order || order.status === "refunded") continue;
      hold(order, "review", "Stripe is reviewing this payment.", { stripe_review_id: review.id });
    }
    for (const order of listOrders()) {
      if (order.status !== "on_hold" || order.hold_kind !== "review" || !order.stripe_review_id) continue;
      if (openReviewIds.has(order.stripe_review_id)) continue;
      const review = await stripe.reviews.retrieve(order.stripe_review_id);
      if (review.open) continue;
      if (review.closed_reason === "refunded" || review.closed_reason === "refunded_as_fraud" || review.closed_reason === "disputed") {
        markRefunded(order, order.amount_cents, "Stripe closed the payment review with a refund.");
      } else {
        restore(order);
      }
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Stripe reviews could not be read.");
  }

  return warnings;
}

export async function prepareOrder(id: number) {
  const order = getOrder(id);
  if (!order) return { ok: false as const, status: 404, error: "That order is not here." };
  if (order.status === "on_hold" || order.status === "refunded") {
    return { ok: false as const, status: 409, error: "This order is on hold. Check Holds / refunds before packing it." };
  }
  if (order.status !== "placed") {
    return { ok: false as const, status: 409, error: "Only a placed order can be marked prepared." };
  }
  if (!order.line1 || !order.city || !order.postal_code || !order.country) {
    return { ok: false as const, status: 400, error: "Stripe did not send a complete shipping address for this order." };
  }

  if (order.label_url && order.tracking_number) {
    const prepared = saveOrder(order.id, { status: "prepared", prepared_at: order.prepared_at || new Date().toISOString(), label_status: "purchased" });
    return { ok: true as const, order: prepared ?? order, labelUrl: order.label_url };
  }

  if (!claimLabelPurchase(order.id)) {
    return { ok: false as const, status: 409, error: "The label for this order is already being bought." };
  }

  const bought = await buyLabel({
    name: order.customer_name || "Dual Sun customer",
    street1: order.line1,
    ...(order.line2 ? { street2: order.line2 } : {}),
    city: order.city,
    state: order.state,
    zip: order.postal_code,
    country: order.country,
    phone: order.customer_phone,
    email: order.customer_email,
  });
  if (!bought.ok) {
    releaseLabelClaim(order.id, bought.error);
    return { ok: false as const, status: 502, error: bought.error };
  }

  const now = new Date().toISOString();
  const prepared = saveOrder(order.id, {
    status: "prepared",
    prepared_at: now,
    label_status: "purchased",
    label_error: "",
    label_url: bought.label.labelUrl,
    tracking_number: bought.label.trackingNumber,
    tracking_url: bought.label.trackingUrl,
    carrier: bought.label.carrier,
    service_level: bought.label.serviceName,
    postage_cents: bought.label.postageCents,
    shippo_transaction_id: bought.label.transactionId,
  });
  return { ok: true as const, order: prepared ?? order, labelUrl: bought.label.labelUrl };
}

export function releaseCarrierHold(id: number) {
  const order = getOrder(id);
  if (!order) return { ok: false as const, status: 404, error: "That order is not here." };
  if (order.status !== "on_hold" || order.hold_kind !== "carrier") {
    return { ok: false as const, status: 409, error: "Only a carrier hold can be released here. Stripe holds clear themselves." };
  }
  return { ok: true as const, order: restore(order) };
}

export function ordersForTab(tab: string) {
  const orders = listOrders();
  const counts = {
    placed: 0,
    prepared: 0,
    shipped: 0,
    delivered: 0,
    holds: 0,
  };
  for (const order of orders) {
    if (order.status === "on_hold" || order.status === "refunded") counts.holds += 1;
    else if (order.status === "placed") counts.placed += 1;
    else if (order.status === "prepared") counts.prepared += 1;
    else if (order.status === "shipped") counts.shipped += 1;
    else if (order.status === "delivered") counts.delivered += 1;
  }
  const selected = orders.filter((order) => {
    if (tab === "holds") return HOLD_TABS.has(order.status);
    return order.status === tab;
  });
  return { orders: selected.map(toPublic), counts };
}

export function applyStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") return recordPaidSession(session.id);
    return Promise.resolve({ ok: true as const });
  }

  if (event.type === "charge.refunded" || event.type === "refund.created" || event.type === "refund.updated") {
    return syncStripe();
  }
  if (event.type.startsWith("charge.dispute.") || event.type === "review.opened" || event.type === "review.closed") {
    return syncStripe();
  }
  return Promise.resolve({ ok: true as const });
}
