import { ORDER_EMAIL, PHONE_TEL } from "../src/lib/order";

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

function labelFileType() {
  const value = process.env.SHIPPO_LABEL_FILE_TYPE?.trim().toUpperCase();
  if (value === "PDF" || value === "PNG") return value;
  return "PDF_4x6";
}

export function shipFromAddress(): { ok: true; address: ShippoAddress } | { ok: false; error: string } {
  const street1 = process.env.SHIPPO_FROM_STREET1?.trim() ?? "";
  const city = process.env.SHIPPO_FROM_CITY?.trim() ?? "";
  const state = process.env.SHIPPO_FROM_STATE?.trim() ?? "";
  const zip = process.env.SHIPPO_FROM_ZIP?.trim() ?? "";
  const country = (process.env.SHIPPO_FROM_COUNTRY?.trim() || "").toUpperCase();
  if (!street1 || !city || !state || !zip || (country !== "US" && country !== "CA")) {
    return {
      ok: false,
      error:
        "Add the ship-from address to .env: SHIPPO_FROM_STREET1, SHIPPO_FROM_CITY, SHIPPO_FROM_STATE, SHIPPO_FROM_ZIP, and SHIPPO_FROM_COUNTRY (US or CA).",
    };
  }
  const street2 = process.env.SHIPPO_FROM_STREET2?.trim();
  return {
    ok: true,
    address: {
      name: process.env.SHIPPO_FROM_NAME?.trim() || "Dual Sun Elixir",
      street1,
      ...(street2 ? { street2 } : {}),
      city,
      state,
      zip,
      country,
      phone: process.env.SHIPPO_FROM_PHONE?.trim() || PHONE_TEL,
      email: process.env.SHIPPO_FROM_EMAIL?.trim() || ORDER_EMAIL,
    },
  };
}

function parcel() {
  const weight = Number(process.env.SHIPPO_PARCEL_WEIGHT_OZ?.trim() || "18");
  return {
    length: process.env.SHIPPO_PARCEL_LENGTH?.trim() || "6",
    width: process.env.SHIPPO_PARCEL_WIDTH?.trim() || "4",
    height: process.env.SHIPPO_PARCEL_HEIGHT?.trim() || "4",
    distance_unit: "in" as const,
    weight: String(Number.isFinite(weight) && weight > 0 ? weight : 18),
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
  const usps = usable.filter((rate) => rate.provider.toUpperCase() === "USPS").sort((a, b) => a.amount - b.amount);
  if (usps.length > 0) return usps[0];
  usable.sort((a, b) => a.amount - b.amount);
  return usable[0] ?? null;
}

export function carrierToken(carrier: string) {
  const raw = carrier.trim().toLowerCase();
  if (!raw || raw.includes("usps")) return "usps";
  return raw.replace(/\s+/g, "_");
}

export async function buyLabel(addressTo: ShippoAddress): Promise<{ ok: true; label: PurchasedLabel } | { ok: false; error: string }> {
  if (!shippoConfigured()) {
    return { ok: false, error: "Shippo is not connected yet. Add SHIPPO_API_TOKEN to .env and restart the site." };
  }
  const from = shipFromAddress();
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
      parcels: [parcel()],
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
    body: JSON.stringify({ rate: chosen.objectId, label_file_type: labelFileType(), async: false }),
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

  const carrier = chosen.provider || "USPS";
  await shippoFetch("/tracks/", {
    method: "POST",
    body: JSON.stringify({ carrier: carrierToken(carrier), tracking_number: trackingNumber }),
  });

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
