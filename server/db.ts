import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
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

let database: DatabaseSync | null = null;

function connection() {
  if (database) return database;
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  database = new DatabaseSync(path.join(dir, "orders.sqlite"));
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_session_id TEXT NOT NULL UNIQUE,
      stripe_payment_intent_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'placed',
      status_before_hold TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      customer_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      line1 TEXT NOT NULL DEFAULT '',
      line2 TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      heard TEXT NOT NULL DEFAULT '',
      label_url TEXT NOT NULL DEFAULT '',
      label_status TEXT NOT NULL DEFAULT 'none',
      label_error TEXT NOT NULL DEFAULT '',
      tracking_number TEXT NOT NULL DEFAULT '',
      tracking_url TEXT NOT NULL DEFAULT '',
      carrier TEXT NOT NULL DEFAULT '',
      service_level TEXT NOT NULL DEFAULT '',
      postage_cents INTEGER NOT NULL DEFAULT 0,
      shippo_transaction_id TEXT NOT NULL DEFAULT '',
      hold_kind TEXT NOT NULL DEFAULT '',
      hold_detail TEXT NOT NULL DEFAULT '',
      stripe_dispute_id TEXT NOT NULL DEFAULT '',
      stripe_review_id TEXT NOT NULL DEFAULT '',
      refund_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      prepared_at TEXT NOT NULL DEFAULT '',
      shipped_at TEXT NOT NULL DEFAULT '',
      delivered_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    UPDATE orders SET label_status = 'failed', label_error = 'The label purchase was interrupted. Try again.' WHERE label_status = 'purchasing';
  `);
  return database;
}

function asOrder(row: Record<string, unknown> | undefined): OrderRow | null {
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

export function getOrder(id: number) {
  const row = connection().prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return asOrder(row);
}

export function getOrderBySession(sessionId: string) {
  const row = connection().prepare(`SELECT * FROM orders WHERE stripe_session_id = ?`).get(sessionId) as
    | Record<string, unknown>
    | undefined;
  return asOrder(row);
}

export function getOrderByPaymentIntent(paymentIntentId: string) {
  const id = paymentIntentId.trim();
  if (!id) return null;
  const row = connection().prepare(`SELECT * FROM orders WHERE stripe_payment_intent_id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return asOrder(row);
}

export function getOrderByTracking(trackingNumber: string) {
  const key = trackingNumber.replace(/\s/g, "").toUpperCase();
  if (!key) return null;
  const rows = connection().prepare(`SELECT * FROM orders WHERE tracking_number != ''`).all() as Record<string, unknown>[];
  for (const row of rows) {
    const stored = String(row.tracking_number ?? "").replace(/\s/g, "").toUpperCase();
    if (stored === key) return asOrder(row);
  }
  return null;
}

export function insertOrder(input: {
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
}) {
  const now = new Date().toISOString();
  const result = connection()
    .prepare(
      `INSERT INTO orders (
        stripe_session_id, stripe_payment_intent_id, quantity, amount_cents, currency,
        customer_name, customer_email, customer_phone, line1, line2, city, state, postal_code, country, heard,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.stripeSessionId,
      input.stripePaymentIntentId,
      input.quantity,
      input.amountCents,
      input.currency,
      input.customerName,
      input.customerEmail,
      input.customerPhone,
      input.line1,
      input.line2,
      input.city,
      input.state,
      input.postalCode,
      input.country,
      input.heard,
      now,
      now,
    );
  return getOrder(Number(result.lastInsertRowid));
}

export function saveOrder(id: number, patch: Partial<OrderRow>) {
  const current = getOrder(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updated_at: new Date().toISOString() };
  const assignments = columns
    .filter((key) => key !== "id")
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = columns.filter((key) => key !== "id").map((key) => next[key]);
  connection()
    .prepare(`UPDATE orders SET ${assignments} WHERE id = ?`)
    .run(...values, id);
  return getOrder(id);
}

export function listOrders() {
  const rows = connection().prepare(`SELECT * FROM orders ORDER BY id DESC`).all() as Record<string, unknown>[];
  return rows.map((row) => asOrder(row)).filter((order): order is OrderRow => order !== null);
}

export function ordersWithTracking(statuses: OrderStatus[]) {
  const marks = statuses.map(() => "?").join(", ");
  const rows = connection()
    .prepare(`SELECT * FROM orders WHERE status IN (${marks}) AND tracking_number != '' ORDER BY id ASC LIMIT 40`)
    .all(...statuses) as Record<string, unknown>[];
  return rows.map((row) => asOrder(row)).filter((order): order is OrderRow => order !== null);
}

export function claimLabelPurchase(id: number) {
  const result = connection()
    .prepare(
      `UPDATE orders SET label_status = 'purchasing', label_error = '', updated_at = ? WHERE id = ? AND status = 'placed' AND label_status IN ('none', 'failed')`,
    )
    .run(new Date().toISOString(), id);
  return result.changes === 1;
}

export function releaseLabelClaim(id: number, error: string) {
  connection()
    .prepare(
      `UPDATE orders SET label_status = 'failed', label_error = ?, updated_at = ? WHERE id = ? AND label_status = 'purchasing'`,
    )
    .run(error.slice(0, 500), new Date().toISOString(), id);
}
