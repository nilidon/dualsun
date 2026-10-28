import type { IncomingMessage, ServerResponse } from "node:http";
import Stripe from "stripe";

const UNIT_AMOUNT = 4000;
const MAX_QUANTITY = 12;

function send(res: ServerResponse, status: number, body: { url?: string; error?: string }) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2048) {
        reject(new Error("Request is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      try {
        resolve(JSON.parse(new TextDecoder().decode(body)));
      } catch {
        reject(new Error("The order could not be read."));
      }
    });
    req.on("error", reject);
  });
}

function allowedOrigin(value: string | string[] | undefined) {
  const origin = Array.isArray(value) ? value[0] : value;
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  const host = url.hostname;
  const known =
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "dualsunelixir.com" ||
    host.endsWith(".dualsunelixir.com");
  if (!known || (url.protocol !== "http:" && url.protocol !== "https:")) return null;
  return origin;
}

export async function handleCheckout(req: IncomingMessage, res: ServerResponse) {
  const path = req.url?.split("?")[0];
  if (path !== "/api/checkout") return false;
  if (req.method !== "POST") {
    send(res, 405, { error: "Use POST." });
    return true;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) {
    send(res, 503, {
      error: "Stripe is not connected yet. Add STRIPE_SECRET_KEY to .env and restart the site.",
    });
    return true;
  }

  try {
    const body = (await readJson(req)) as { quantity?: unknown };
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      send(res, 400, { error: "Choose between 1 and 12 bottles." });
      return true;
    }
    const origin = allowedOrigin(req.headers.origin);
    if (!origin) {
      send(res, 400, { error: "Checkout can only start from the Dual Sun site." });
      return true;
    }

    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: UNIT_AMOUNT,
            product_data: {
              name: "Dual Sun Elixir Gold Edition",
              description: "250 mL. Honey, ginger, turmeric, lemon, and black pepper.",
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["US", "CA"] },
      phone_number_collection: { enabled: true },
      custom_fields: [
        {
          key: "heard",
          label: { type: "custom", custom: "How did this bottle reach you?" },
          type: "dropdown",
          optional: true,
          dropdown: {
            options: [
              { label: "Someone I know", value: "someone" },
              { label: "A gift", value: "gift" },
              { label: "Ordered before", value: "reorder" },
              { label: "This website", value: "website" },
              { label: "Other", value: "other" },
            ],
          },
        },
      ],
      success_url: `${origin}/order/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata: { sku: "DSE-GOLD-250", quantity: String(quantity) },
    });

    if (!session.url) {
      send(res, 502, { error: "Stripe did not return a checkout link." });
      return true;
    }
    send(res, 200, { url: session.url });
  } catch (error) {
    console.error(error);
    send(res, 502, { error: "Stripe could not start checkout. Check the secret key and try again." });
  }
  return true;
}
