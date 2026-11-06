import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ORDER_EMAIL, PHONE_TEL } from "../src/lib/order";
import type { OrderStatus } from "./carrier-status";

export type { OrderStatus };

export type OrderRow = {
  id: number;
  stripe_session_id: string;
  stripe_payment_intent_id: string;
  status: OrderStatus;
  status_before_hold: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  heard: string;
  label_url: string;
  label_status: string;
  label_error: string;
  tracking_number: string;
  tracking_url: string;
  carrier: string;
  service_level: string;
  postage_cents: number;
  shippo_transaction_id: string;
  hold_kind: string;
  hold_detail: string;
  stripe_dispute_id: string;
  stripe_review_id: string;
  refund_cents: number;
  created_at: string;
  prepared_at: string;
  shipped_at: string;
  delivered_at: string;
  updated_at: string;
};

const columns: (keyof OrderRow)[] = [
  "id",
  "stripe_session_id",
  "stripe_payment_intent_id",
  "status",
  "status_before_hold",
  "quantity",
  "amount_cents",
  "currency",
  "customer_name",
  "customer_email",
  "customer_phone",
  "line1",
  "line2",
  "city",
  "state",
  "postal_code",
  "country",
  "heard",
  "label_url",
  "label_status",
  "label_error",
  "tracking_number",
  "tracking_url",
  "carrier",
  "service_level",
  "postage_cents",
  "shippo_transaction_id",
  "hold_kind",
  "hold_detail",
  "stripe_dispute_id",
  "stripe_review_id",
  "refund_cents",
  "created_at",
  "prepared_at",
  "shipped_at",
  "delivered_at",
  "updated_at",
];

const MISSING = "Add SUPABASE_URL and SUPABASE_SECRET_KEY to the server environment.";
const SCHEMA = "Run supabase/schema.sql in the Supabase SQL editor, then try again.";

let client: SupabaseClient | null = null;
let prepared: Promise<void> | null = null;

function database() {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error(MISSING);
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

function raise(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "PGRST205" || error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
    throw new Error(SCHEMA);
  }
  throw new Error(error.message);
}

function ready() {
  if (!prepared) {
    prepared = Promise.resolve(
      database()
        .from("orders")
        .update({
          label_status: "failed",
          label_error: "The label purchase was interrupted. Try again.",
        })
        .eq("label_status", "purchasing"),
    )
      .then(({ error }) => {
        raise(error);
      })
      .catch((error: unknown) => {
        prepared = null;
        client = null;
        throw error;
      });
  }
  return prepared;
}

function asOrder(row: Record<string, unknown> | null | undefined): OrderRow | null {
  if (!row) return null;
  const order = {} as OrderRow;
  for (const key of columns) {
    const value = row[key];
    if (key === "id" || key === "quantity" || key === "amount_cents" || key === "postage_cents" || key === "refund_cents") {
      order[key] = Number(value ?? 0);
    } else if (key === "status") {
      order.status = String(value ?? "placed") as OrderStatus;
    } else {
      order[key] = String(value ?? "") as never;
    }
  }
  return order;
}

function record(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return data as Record<string, unknown>;
}

export async function getOrder(id: number) {
  await ready();
  const { data, error } = await database().from("orders").select("*").eq("id", id).maybeSingle();
  raise(error);
  return asOrder(record(data));
}

export async function getOrderBySession(sessionId: string) {
  await ready();
  const { data, error } = await database().from("orders").select("*").eq("stripe_session_id", sessionId).maybeSingle();
  raise(error);
  return asOrder(record(data));
}

export async function getOrderByPaymentIntent(paymentIntentId: string) {
  const id = paymentIntentId.trim();
  if (!id) return null;
  await ready();
  const { data, error } = await database().from("orders").select("*").eq("stripe_payment_intent_id", id).maybeSingle();
  raise(error);
  return asOrder(record(data));
}

export async function getOrderByTracking(trackingNumber: string) {
  const key = trackingNumber.replace(/\s/g, "").toUpperCase();
  if (!key) return null;
  await ready();
  const { data, error } = await database().from("orders").select("*").neq("tracking_number", "");
  raise(error);
  for (const row of data ?? []) {
    const stored = String(record(row)?.tracking_number ?? "").replace(/\s/g, "").toUpperCase();
    if (stored === key) return asOrder(record(row));
  }
  return null;
}

export async function insertOrder(input: {
  stripeSessionId: string;
  stripePaymentIntentId: string;
  quantity: number;
  amountCents: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  heard: string;
}): Promise<OrderRow | null> {
  await ready();
  const now = new Date().toISOString();
  const { data, error } = await database()
    .from("orders")
    .insert({
      stripe_session_id: input.stripeSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId,
      quantity: input.quantity,
      amount_cents: input.amountCents,
      currency: input.currency,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      country: input.country,
      heard: input.heard,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  raise(error);
  return asOrder(record(data));
}

export async function saveOrder(id: number, patch: Partial<OrderRow>) {
  const current = await getOrder(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updated_at: new Date().toISOString() };
  const fields = Object.fromEntries(columns.filter((key) => key !== "id").map((key) => [key, next[key]]));
  const { error } = await database().from("orders").update(fields).eq("id", id);
  raise(error);
  return getOrder(id);
}

export async function listOrders() {
  await ready();
  const { data, error } = await database().from("orders").select("*").order("id", { ascending: false });
  raise(error);
  return (data ?? []).map((row) => asOrder(record(row))).filter((order): order is OrderRow => order !== null);
}

export async function ordersWithTracking(statuses: OrderStatus[]) {
  await ready();
  const { data, error } = await database()
    .from("orders")
    .select("*")
    .in("status", statuses)
    .neq("tracking_number", "")
    .order("id", { ascending: true })
    .limit(40);
  raise(error);
  return (data ?? []).map((row) => asOrder(record(row))).filter((order): order is OrderRow => order !== null);
}

export async function claimLabelPurchase(id: number) {
  await ready();
  const { data, error } = await database()
    .from("orders")
    .update({ label_status: "purchasing", label_error: "", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "placed")
    .in("label_status", ["none", "failed"])
    .select("id");
  raise(error);
  return (data ?? []).length === 1;
}

export type ShippingSettings = {
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  weightOz: string;
  length: string;
  width: string;
  height: string;
};

function blankShipping(): ShippingSettings {
  return {
    street1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: PHONE_TEL,
    email: ORDER_EMAIL,
    weightOz: "18",
    length: "6",
    width: "4",
    height: "4",
  };
}

function shippingFrom(row: Record<string, unknown> | undefined): ShippingSettings {
  if (!row) return blankShipping();
  return {
    street1: String(row.street1 ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    zip: String(row.zip ?? ""),
    country: String(row.country ?? "US"),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    weightOz: String(row.weight_oz ?? "18"),
    length: String(row.length ?? "6"),
    width: String(row.width ?? "4"),
    height: String(row.height ?? "4"),
  };
}

export async function readShippingSettings(): Promise<ShippingSettings> {
  await ready();
  const { data, error } = await database().from("shipping_settings").select("*").eq("id", 1).maybeSingle();
  raise(error);
  return shippingFrom(record(data));
}

export async function writeShippingSettings(settings: ShippingSettings) {
  await ready();
  const { error } = await database().from("shipping_settings").upsert(
    {
      id: 1,
      street1: settings.street1,
      city: settings.city,
      state: settings.state,
      zip: settings.zip,
      country: settings.country,
      phone: settings.phone,
      email: settings.email,
      weight_oz: settings.weightOz,
      length: settings.length,
      width: settings.width,
      height: settings.height,
    },
    { onConflict: "id" },
  );
  raise(error);
  return readShippingSettings();
}

export async function releaseLabelClaim(id: number, error: string) {
  await ready();
  const { error: updateError } = await database()
    .from("orders")
    .update({
      label_status: "failed",
      label_error: error.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("label_status", "purchasing");
  raise(updateError);
}
