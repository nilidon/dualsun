import { mkdirSync } from "node:fs";
import path from "node:path";
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

const SCHEMA = `
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
    CREATE TABLE IF NOT EXISTS shipping_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      street1 TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      zip TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'US',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      weight_oz TEXT NOT NULL DEFAULT '18',
      length TEXT NOT NULL DEFAULT '6',
      width TEXT NOT NULL DEFAULT '4',
      height TEXT NOT NULL DEFAULT '4'
    );
    UPDATE orders SET label_status = 'failed', label_error = 'The label purchase was interrupted. Try again.' WHERE label_status = 'purchasing';
`;

type SqlRow = Record<string, unknown>;

type Sql = {
  get(sql: string, params?: unknown[]): Promise<SqlRow | undefined>;
  all(sql: string, params?: unknown[]): Promise<SqlRow[]>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastId: number }>;
};

const DATABASE_ERROR = "Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Vercel so orders can be saved.";

function values(params: unknown[] = []) {
  return params.map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number" || typeof value === "string" || typeof value === "bigint" || value === null) return value;
    return String(value ?? "");
  });
}

function plain(row: { [key: string]: unknown } | undefined, names: string[]): SqlRow | undefined {
  if (!row) return undefined;
  const out: SqlRow = {};
  for (const key of names) {
    const value = row[key];
    out[key] = typeof value === "bigint" ? Number(value) : value;
  }
  return out;
}

let ready: Promise<Sql> | null = null;

function database() {
  if (!ready) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    const opening = url ? remote(url) : process.env.VERCEL ? Promise.reject(new Error(DATABASE_ERROR)) : local();
    ready = opening.catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function remote(url: string): Promise<Sql> {
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken) throw new Error(DATABASE_ERROR);
  const { createClient } = await import("@libsql/client/web");
  const client = createClient({ url, authToken });
  await client.executeMultiple(SCHEMA);
  return {
    async get(sql, params) {
      const result = await client.execute({ sql, args: values(params) });
      return plain(result.rows[0], result.columns);
    },
    async all(sql, params) {
      const result = await client.execute({ sql, args: values(params) });
      return result.rows
        .map((row) => plain(row, result.columns))
        .filter((row): row is SqlRow => row !== undefined);
    },
    async run(sql, params) {
      const result = await client.execute({ sql, args: values(params) });
      return { changes: result.rowsAffected, lastId: Number(result.lastInsertRowid ?? 0) };
    },
  };
}

async function local(): Promise<Sql> {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const sqlite = new DatabaseSync(path.join(dir, "orders.sqlite"));
  sqlite.exec(`PRAGMA journal_mode = WAL;${SCHEMA}`);
  return {
    async get(sql, params) {
      const row = sqlite.prepare(sql).get(...values(params)) as SqlRow | undefined;
      return row;
    },
    async all(sql, params) {
      return sqlite.prepare(sql).all(...values(params)) as SqlRow[];
    },
    async run(sql, params) {
      const result = sqlite.prepare(sql).run(...values(params));
      return { changes: Number(result.changes), lastId: Number(result.lastInsertRowid ?? 0) };
    },
  };
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

export async function getOrder(id: number) {
  const row = await (await database()).get(`SELECT * FROM orders WHERE id = ?`, [id]);
  return asOrder(row);
}

export async function getOrderBySession(sessionId: string) {
  const row = await (await database()).get(`SELECT * FROM orders WHERE stripe_session_id = ?`, [sessionId]);
  return asOrder(row);
}

export async function getOrderByPaymentIntent(paymentIntentId: string) {
  const id = paymentIntentId.trim();
  if (!id) return null;
  const row = await (await database()).get(`SELECT * FROM orders WHERE stripe_payment_intent_id = ?`, [id]);
  return asOrder(row);
}

export async function getOrderByTracking(trackingNumber: string) {
  const key = trackingNumber.replace(/\s/g, "").toUpperCase();
  if (!key) return null;
  const rows = await (await database()).all(`SELECT * FROM orders WHERE tracking_number != ''`);
  for (const row of rows) {
    const stored = String(row.tracking_number ?? "").replace(/\s/g, "").toUpperCase();
    if (stored === key) return asOrder(row);
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
  const now = new Date().toISOString();
  const result = await (await database()).run(
    `INSERT INTO orders (
        stripe_session_id, stripe_payment_intent_id, quantity, amount_cents, currency,
        customer_name, customer_email, customer_phone, line1, line2, city, state, postal_code, country, heard,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  );
  return getOrder(result.lastId);
}

export async function saveOrder(id: number, patch: Partial<OrderRow>) {
  const current = await getOrder(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updated_at: new Date().toISOString() };
  const assignments = columns
    .filter((key) => key !== "id")
    .map((key) => `${key} = ?`)
    .join(", ");
  const fields = columns.filter((key) => key !== "id").map((key) => next[key]);
  await (await database()).run(`UPDATE orders SET ${assignments} WHERE id = ?`, [...fields, id]);
  return getOrder(id);
}

export async function listOrders() {
  const rows = await (await database()).all(`SELECT * FROM orders ORDER BY id DESC`);
  return rows.map((row) => asOrder(row)).filter((order): order is OrderRow => order !== null);
}

export async function ordersWithTracking(statuses: OrderStatus[]) {
  const marks = statuses.map(() => "?").join(", ");
  const rows = await (await database()).all(
    `SELECT * FROM orders WHERE status IN (${marks}) AND tracking_number != '' ORDER BY id ASC LIMIT 40`,
    statuses,
  );
  return rows.map((row) => asOrder(row)).filter((order): order is OrderRow => order !== null);
}

export async function claimLabelPurchase(id: number) {
  const result = await (await database()).run(
    `UPDATE orders SET label_status = 'purchasing', label_error = '', updated_at = ? WHERE id = ? AND status = 'placed' AND label_status IN ('none', 'failed')`,
    [new Date().toISOString(), id],
  );
  return result.changes === 1;
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

export async function readShippingSettings(): Promise<ShippingSettings> {
  const row = await (await database()).get(`SELECT * FROM shipping_settings WHERE id = 1`);
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

export async function writeShippingSettings(settings: ShippingSettings) {
  await (await database()).run(
    `INSERT INTO shipping_settings (id, street1, city, state, zip, country, phone, email, weight_oz, length, width, height)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         street1 = excluded.street1,
         city = excluded.city,
         state = excluded.state,
         zip = excluded.zip,
         country = excluded.country,
         phone = excluded.phone,
         email = excluded.email,
         weight_oz = excluded.weight_oz,
         length = excluded.length,
         width = excluded.width,
         height = excluded.height`,
    [
      settings.street1,
      settings.city,
      settings.state,
      settings.zip,
      settings.country,
      settings.phone,
      settings.email,
      settings.weightOz,
      settings.length,
      settings.width,
      settings.height,
    ],
  );
  return readShippingSettings();
}

export async function releaseLabelClaim(id: number, error: string) {
  await (await database()).run(
    `UPDATE orders SET label_status = 'failed', label_error = ?, updated_at = ? WHERE id = ? AND label_status = 'purchasing'`,
    [error.slice(0, 500), new Date().toISOString(), id],
  );
}
