import { readShippingSettings } from "./db";

const SHIPPO_API_BASE = "https://api.goshippo.com";

export type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

type Rate = {
  objectId: string;
  provider: string;
  serviceName: string;
  amount: number;
  currency: string;
  attributes: string[];
};

export type PurchasedLabel = {
  transactionId: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  carrier: string;
  serviceName: string;
  postageCents: number;
};

function token() {
  return process.env.SHIPPO_API_TOKEN?.trim() ?? "";
}

export function shippoConfigured() {
  return token().length > 0;
}

const LABEL_FILE_TYPE = "PDF_4x6";
const FROM_NAME = "Dual Sun Elixir";

export async function shipFromAddress(): Promise<{ ok: true; address: ShippoAddress } | { ok: false; error: string }> {
  const settings = await readShippingSettings();
  const country = settings.country.trim().toUpperCase();
  const weight = Number(settings.weightOz);
  const length = Number(settings.length);
  const width = Number(settings.width);
  const height = Number(settings.height);
  if (!settings.street1 || !settings.city || !settings.state || !settings.zip || (country !== "US" && country !== "CA")) {
    return { ok: false, error: "Save the ship-from address on this page before printing a label." };
  }
  if (!settings.phone || !settings.email.includes("@")) {
    return { ok: false, error: "Save a phone and email on this page before printing a label." };
  }
  if (!(weight > 0) || !(length > 0) || !(width > 0) || !(height > 0)) {
    return { ok: false, error: "Save the parcel weight and size on this page before printing a label." };
  }
  return {
    ok: true,
    address: {
      name: FROM_NAME,
      street1: settings.street1,
      city: settings.city,
      state: settings.state,
      zip: settings.zip,
      country,
      phone: settings.phone,
      email: settings.email,
    },
  };
}

async function parcel(quantity: number) {
  const settings = await readShippingSettings();
  const bottles = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const weight = Number(settings.weightOz) * bottles;
  return {
    length: settings.length,
    width: settings.width,
    height: settings.height,
    distance_unit: "in" as const,
    weight: String(weight),
    mass_unit: "oz" as const,
  };
}

function messagesOf(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return String((item as { text?: string }).text ?? "").trim();
    })
    .filter(Boolean);
}

async function shippoFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${SHIPPO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `ShippoToken ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : messagesOf(data.messages).join(" ");
    return { ok: false as const, error: detail || `Shippo request failed (${response.status}).` };
  }
  return { ok: true as const, data };
}

function parseRate(raw: Record<string, unknown>): Rate | null {
  const objectId = String(raw.object_id ?? "").trim();
  if (!objectId) return null;
  const service =
    raw.servicelevel && typeof raw.servicelevel === "object" ? (raw.servicelevel as Record<string, unknown>) : {};
  const amount = Number(raw.amount);
  return {
    objectId,
    provider: String(raw.provider ?? "").trim(),
    serviceName: String(service.name ?? raw.servicelevel_name ?? "").trim(),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: String(raw.currency ?? "USD").trim() || "USD",
    attributes: Array.isArray(raw.attributes) ? raw.attributes.map((item) => String(item)) : [],
  };
}

function pickRate(rates: Rate[]) {
  const usable = rates.filter((rate) => rate.amount > 0 && !rate.attributes.includes("CHEAPEST_DISABLED"));
  if (usable.length === 0) return null;
  const marked = usable.filter((rate) => rate.attributes.includes("CHEAPEST"));
  const pool = marked.length > 0 ? marked : usable;
  pool.sort((a, b) => a.amount - b.amount);
  return pool[0];
}

export function carrierToken(carrier: string) {
  const raw = carrier.trim().toLowerCase();
  if (!raw || raw.includes("usps")) return "usps";
  return raw.replace(/\s+/g, "_");
}

export async function buyLabel(
  addressTo: ShippoAddress,
  quantity: number,
): Promise<{ ok: true; label: PurchasedLabel } | { ok: false; error: string }> {
  if (!shippoConfigured()) {
    return { ok: false, error: "Shippo is not connected yet. Add SHIPPO_API_TOKEN to .env and restart the site." };
  }
  const from = await shipFromAddress();
  if (!from.ok) return from;

  const shipment = await shippoFetch("/shipments/", {
    method: "POST",
    body: JSON.stringify({
      address_from: from.address,
      address_to: {
        ...addressTo,
        phone: addressTo.phone || undefined,
        email: addressTo.email || undefined,
      },
      parcels: [await parcel(quantity)],
      async: false,
    }),
  });
  if (!shipment.ok) return shipment;

  const rates = (Array.isArray(shipment.data.rates) ? shipment.data.rates : [])
    .map((rate) => (rate && typeof rate === "object" ? parseRate(rate as Record<string, unknown>) : null))
    .filter((rate): rate is Rate => rate !== null);
  const chosen = pickRate(rates);
  if (!chosen) {
    const note = messagesOf(shipment.data.messages).join(" ");
    return { ok: false, error: note || "Shippo did not return a postage rate for this address." };
  }

  const bought = await shippoFetch("/transactions/", {
    method: "POST",
    body: JSON.stringify({ rate: chosen.objectId, label_file_type: LABEL_FILE_TYPE, async: false }),
  });
  if (!bought.ok) return bought;
  if (String(bought.data.status ?? "").toUpperCase() !== "SUCCESS") {
    const note = messagesOf(bought.data.messages).join(" ");
    return { ok: false, error: note || "Shippo could not buy the label." };
  }

  const trackingNumber = String(bought.data.tracking_number ?? "").trim();
  const labelUrl = String(bought.data.label_url ?? "").trim();
  const transactionId = String(bought.data.object_id ?? "").trim();
  if (!trackingNumber || !labelUrl || !transactionId) {
    return { ok: false, error: "Shippo did not return a label to print." };
  }

  const carrier = chosen.provider;
  if (carrier) {
    await shippoFetch("/tracks/", {
      method: "POST",
      body: JSON.stringify({ carrier: carrierToken(carrier), tracking_number: trackingNumber }),
    });
  }

  return {
    ok: true,
    label: {
      transactionId,
      trackingNumber,
      trackingUrl: String(bought.data.tracking_url_provider ?? "").trim(),
      labelUrl,
      carrier,
      serviceName: chosen.serviceName,
      postageCents: Math.round(chosen.amount * 100),
    },
  };
}

export async function trackingStatus(carrier: string, trackingNumber: string) {
  const path = `/tracks/${encodeURIComponent(carrierToken(carrier))}/${encodeURIComponent(trackingNumber.trim())}`;
  const response = await shippoFetch(path);
  if (!response.ok) return response;
  const block =
    response.data.tracking_status && typeof response.data.tracking_status === "object"
      ? (response.data.tracking_status as Record<string, unknown>)
      : {};
  const sub = block.substatus && typeof block.substatus === "object" ? (block.substatus as Record<string, unknown>) : {};
  const status = String(block.status ?? response.data.status ?? "").trim();
  if (!status) return { ok: false as const, error: "Shippo did not return a tracking status." };
  return {
    ok: true as const,
    status,
    substatus: String(sub.code ?? "").trim() || null,
  };
}
