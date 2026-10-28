import type { IncomingMessage, ServerResponse } from "node:http";
import Stripe from "stripe";
import type { Connect, Plugin } from "vite";
import { adminConfigured, checkPassword, clearCookie, readSession, sessionCookie } from "./admin-auth";
import { handleCheckout } from "./checkout";
import { loadServerEnv } from "./env";
import {
  applyCarrierUpdate,
  applyStripeEvent,
  ordersForTab,
  prepareOrder,
  recordPaidSession,
  releaseCarrierHold,
  stripeConfigured,
  syncStripe,
  syncTracking,
  toPublic,
} from "./orders";
import { shippoConfigured } from "./shippo";

const TABS = new Set(["placed", "prepared", "shipped", "delivered", "holds"]);

function send(res: ServerResponse, status: number, body: unknown, cookie?: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  if (cookie) res.setHeader("Set-Cookie", cookie);
  res.end(JSON.stringify(body));
}

function header(req: IncomingMessage, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function readBody(req: IncomingMessage, max: number) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    req.on("data", (chunk: Uint8Array) => {
      size += chunk.length;
      if (size > max) {
        reject(new Error("Request is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(body);
    });
    req.on("error", reject);
  });
}

async function readJson(req: IncomingMessage) {
  const raw = await readBody(req, 100_000);
  if (raw.length === 0) return {};
  return JSON.parse(new TextDecoder().decode(raw)) as unknown;
}

function secureRequest(req: IncomingMessage) {
  return header(req, "x-forwarded-proto") === "https";
}

function signedIn(req: IncomingMessage) {
  return readSession(header(req, "cookie"));
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function handleAdmin(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    if (!adminConfigured()) {
      send(res, 503, { error: "Add ADMIN_PASSWORD to .env (at least 8 characters) and restart the site." });
      return;
    }
    const body = (await readJson(req)) as { password?: unknown };
    if (!checkPassword(text(body.password))) {
      send(res, 401, { error: "That password is not right." });
      return;
    }
    send(res, 200, { ok: true }, sessionCookie(secureRequest(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    send(res, 200, { ok: true }, clearCookie());
    return;
  }

  if (!signedIn(req)) {
    send(res, 401, { error: "Sign in again." });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/orders") {
    const tab = url.searchParams.get("tab") || "placed";
    if (!TABS.has(tab)) {
      send(res, 400, { error: "Unknown order tab." });
      return;
    }
    const warnings = (await syncStripe()) ?? [];
    await syncTracking();
    const from = shippoConfigured();
    const { orders, counts } = ordersForTab(tab);
    send(res, 200, {
      orders,
      counts,
      warnings,
      shippo: from,
      stripe: stripeConfigured(),
    });
    return;
  }

  const prepare = url.pathname.match(/^\/api\/admin\/orders\/(\d+)\/prepare$/);
  if (req.method === "POST" && prepare) {
    const result = await prepareOrder(Number(prepare[1]));
    if (!result.ok) {
      send(res, result.status, { error: result.error });
      return;
    }
    send(res, 200, { order: toPublic(result.order), labelUrl: result.labelUrl });
    return;
  }

  const release = url.pathname.match(/^\/api\/admin\/orders\/(\d+)\/release$/);
  if (req.method === "POST" && release) {
    const result = releaseCarrierHold(Number(release[1]));
    if (!result.ok) {
      send(res, result.status, { error: result.error });
      return;
    }
    send(res, 200, { order: toPublic(result.order) });
    return;
  }

  send(res, 404, { error: "Not found." });
}

function shippoWebhookAllowed(req: IncomingMessage, url: URL) {
  const secret = process.env.SHIPPO_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return url.searchParams.get("token") === secret || header(req, "x-shippo-webhook-token") === secret;
}

function carrierStatusOf(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const event = text(root.event);
  if (event && event !== "track_updated" && event !== "tracking_updated") return null;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const trackingNumber = text(data.tracking_number) || text(data.trackingNumber);
  const block = data.tracking_status ?? data.trackingStatus;
  let status = "";
  let substatus: string | null = null;
  if (typeof block === "string") status = block.trim();
  if (block && typeof block === "object") {
    const record = block as Record<string, unknown>;
    status = text(record.status);
    const sub = record.substatus;
    if (sub && typeof sub === "object") substatus = text((sub as Record<string, unknown>).code) || null;
  }
  if (!trackingNumber || !status) return null;
  return { trackingNumber, status, substatus };
}

export async function handleApi(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/api/checkout") return handleCheckout(req, res);

  if (req.method === "POST" && url.pathname === "/api/orders/confirm") {
    const body = (await readJson(req)) as { sessionId?: unknown };
    const sessionId = text(body.sessionId);
    if (!sessionId.startsWith("cs_")) {
      send(res, 400, { error: "Missing payment." });
      return true;
    }
    const saved = await recordPaidSession(sessionId);
    send(res, saved.ok ? 200 : 400, saved.ok ? { ok: true } : { error: saved.error });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/stripe/webhook") {
    const key = process.env.STRIPE_SECRET_KEY;
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!key?.startsWith("sk_") || !secret) {
      send(res, 503, { error: "Stripe webhooks are not configured." });
      return true;
    }
    const raw = new TextDecoder().decode(await readBody(req, 1_000_000));
    try {
      const event = Stripe.webhooks.constructEvent(raw, header(req, "stripe-signature") ?? "", secret);
      await applyStripeEvent(event);
    } catch (error) {
      console.error(error);
      send(res, 400, { error: "Stripe webhook was rejected." });
      return true;
    }
    send(res, 200, { received: true });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/shippo/webhook") {
    if (!shippoWebhookAllowed(req, url)) {
      send(res, 401, { error: "Shippo webhook was rejected." });
      return true;
    }
    const payload = JSON.parse(new TextDecoder().decode(await readBody(req, 1_000_000))) as unknown;
    const update = carrierStatusOf(payload);
    if (update) applyCarrierUpdate(update.trackingNumber, update.status, update.substatus);
    send(res, 200, { received: true });
    return true;
  }

  if (url.pathname.startsWith("/api/admin/")) {
    await handleAdmin(req, res, url);
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    send(res, 404, { error: "Not found." });
    return true;
  }
  return false;
}

function attach(middlewares: Connect.Server, mode: string, envDir: string | false) {
  loadServerEnv(mode, envDir);
  middlewares.use((req, res, next) => {
    void handleApi(req, res)
      .then((handled) => {
        if (!handled) next();
      })
      .catch((error) => {
        console.error(error);
        if (res.headersSent) return;
        send(res, 500, { error: "Something went wrong." });
      });
  });
}

export function shopServer(): Plugin {
  return {
    name: "dualsun-shop",
    configureServer(server) {
      attach(server.middlewares, server.config.mode, server.config.envDir);
    },
    configurePreviewServer(server) {
      attach(server.middlewares, "production", server.config.envDir);
    },
  };
}
