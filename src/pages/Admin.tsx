import { useCallback, useEffect, useState, type FormEvent } from "react";
import { money } from "../lib/order";

type Tab = "placed" | "prepared" | "shipped" | "delivered" | "holds";

type Order = {
  id: number;
  status: string;
  quantity: number;
  amountCents: number;
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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

type Counts = Record<Tab, number>;

type Shipping = {
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

const tabs: { id: Tab; label: string; empty: string }[] = [
  { id: "placed", label: "Placed", empty: "No paid orders are waiting." },
  { id: "prepared", label: "Prepared", empty: "Nothing is packed right now." },
  { id: "shipped", label: "Shipped", empty: "Nothing is in transit." },
  { id: "delivered", label: "Delivered", empty: "Nothing has been delivered yet." },
  { id: "holds", label: "Holds / refunds", empty: "Stripe has no open holds or refunds." },
];

const emptyCounts: Counts = { placed: 0, prepared: 0, shipped: 0, delivered: 0, holds: 0 };

function when(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function address(order: Order) {
  const city = [order.city, order.state, order.postalCode].filter(Boolean).join(", ");
  return [order.line1, order.line2, city, order.country].filter(Boolean);
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || "Something went wrong.";
}

export function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("placed");
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [shippo, setShippo] = useState(true);
  const [stripe, setStripe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [shipping, setShipping] = useState<Shipping | null>(null);
  const [shippingError, setShippingError] = useState("");
  const [shippingSaved, setShippingSaved] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);

  const load = useCallback(async (next: Tab) => {
    setLoading(true);
    let response: Response;
    try {
      response = await fetch(`/api/admin/orders?tab=${next}`);
    } catch {
      setActionError("The orders page could not be reached.");
      setAuthed(false);
      setLoading(false);
      return;
    }
    if (response.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setActionError(await readError(response));
      setLoading(false);
      return;
    }
    const body = (await response.json()) as {
      orders: Order[];
      counts: Counts;
      warnings?: string[];
      shippo?: boolean;
      stripe?: boolean;
    };
    setAuthed(true);
    setOrders(body.orders);
    setCounts(body.counts);
    setWarnings(body.warnings ?? []);
    setShippo(body.shippo !== false);
    setStripe(body.stripe !== false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  useEffect(() => {
    if (!authed) return;
    void fetch("/api/admin/shipping")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { settings: Shipping };
        setShipping(body.settings);
      })
      .catch(() => undefined);
  }, [authed]);

  function setField(key: keyof Shipping, value: string) {
    setShippingSaved(false);
    setShipping((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveShipping(event: FormEvent) {
    event.preventDefault();
    if (!shipping) return;
    setSavingShipping(true);
    setShippingError("");
    setShippingSaved(false);
    const response = await fetch("/api/admin/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shipping),
    });
    setSavingShipping(false);
    if (!response.ok) {
      setShippingError(await readError(response));
      return;
    }
    const body = (await response.json()) as { settings: Shipping };
    setShipping(body.settings);
    setShippingSaved(true);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setLoginError(await readError(response));
      return;
    }
    setPassword("");
    setAuthed(true);
    await load(tab);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setOrders([]);
  }

  async function prepare(order: Order) {
    setActionError("");
    setBusyId(order.id);
    const response = await fetch(`/api/admin/orders/${order.id}/prepare`, { method: "POST" });
    setBusyId(null);
    if (!response.ok) {
      setActionError(await readError(response));
      await load(tab);
      return;
    }
    const body = (await response.json()) as { labelUrl?: string };
    if (body.labelUrl) window.open(body.labelUrl, "_blank", "noopener");
    await load(tab);
  }

  async function release(order: Order) {
    setActionError("");
    setBusyId(order.id);
    const response = await fetch(`/api/admin/orders/${order.id}/release`, { method: "POST" });
    setBusyId(null);
    if (!response.ok) {
      setActionError(await readError(response));
      return;
    }
    await load(tab);
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-8 text-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brass">Dual Sun</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">Orders</h1>
          </div>
          {authed ? (
            <button type="button" className="cursor-pointer text-sm font-semibold text-stone" onClick={() => void logout()}>
              Sign out
            </button>
          ) : null}
        </header>

        {authed === null ? <p className="mt-10 text-stone">Loading orders.</p> : null}

        {authed === false ? (
          <form className="mt-10 max-w-sm" onSubmit={(event) => void login(event)}>
            <label className="text-sm font-semibold" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-full border border-ink/15 bg-cream px-5 outline-none"
            />
            {loginError ? <p className="mt-3 text-sm text-brass">{loginError}</p> : null}
            <button type="submit" className="mt-4 h-12 cursor-pointer rounded-full bg-gold px-6 text-sm font-semibold">
              Open orders
            </button>
          </form>
        ) : null}

        {authed ? (
          <>
            {shipping ? (
              <form className="mt-8 rounded-[1.5rem] bg-cream p-6" onSubmit={(event) => void saveShipping(event)}>
                <h2 className="font-display text-2xl font-extrabold">Ship from</h2>
                <p className="mt-2 text-sm text-stone">Printed on the label as Dual Sun Elixir. The parcel is one packed bottle.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Street" value={shipping.street1} onChange={(value) => setField("street1", value)} />
                  <Field label="City" value={shipping.city} onChange={(value) => setField("city", value)} />
                  <Field label="State" value={shipping.state} onChange={(value) => setField("state", value)} />
                  <Field label="ZIP" value={shipping.zip} onChange={(value) => setField("zip", value)} />
                  <label className="text-sm font-semibold">
                    Country
                    <select
                      value={shipping.country}
                      onChange={(event) => setField("country", event.target.value)}
                      className="mt-2 h-11 w-full rounded-full border border-ink/15 bg-paper px-4"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                    </select>
                  </label>
                  <Field label="Phone" value={shipping.phone} onChange={(value) => setField("phone", value)} />
                  <Field label="Email" value={shipping.email} onChange={(value) => setField("email", value)} />
                  <Field label="Weight (oz)" value={shipping.weightOz} onChange={(value) => setField("weightOz", value)} />
                  <Field label="Length (in)" value={shipping.length} onChange={(value) => setField("length", value)} />
                  <Field label="Width (in)" value={shipping.width} onChange={(value) => setField("width", value)} />
                  <Field label="Height (in)" value={shipping.height} onChange={(value) => setField("height", value)} />
                </div>
                {shippingError ? <p className="mt-3 text-sm text-brass">{shippingError}</p> : null}
                {shippingSaved ? <p className="mt-3 text-sm text-stone">Saved.</p> : null}
                <button
                  type="submit"
                  disabled={savingShipping}
                  className="mt-5 h-11 cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold disabled:opacity-60"
                >
                  {savingShipping ? "Saving…" : "Save shipping"}
                </button>
              </form>
            ) : null}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${tab === item.id ? "bg-ink text-cream" : "bg-cream text-ink"}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label} {counts[item.id]}
                </button>
              ))}
            </div>

            {!shippo ? (
              <p className="mt-4 text-sm text-brass">Add SHIPPO_API_TOKEN before a label can be bought.</p>
            ) : null}
            {!stripe ? <p className="mt-2 text-sm text-brass">Add STRIPE_SECRET_KEY so paid orders and refunds can sync.</p> : null}
            {warnings.map((warning) => (
              <p key={warning} className="mt-2 text-sm text-brass">
                {warning}
              </p>
            ))}
            {actionError ? <p className="mt-4 text-sm text-brass">{actionError}</p> : null}

            <div className="mt-6 grid gap-4">
              {loading && orders.length === 0 ? <p className="text-stone">Loading orders.</p> : null}
              {!loading && orders.length === 0 ? <p className="text-stone">{tabs.find((item) => item.id === tab)?.empty}</p> : null}
              {orders.map((order) => (
                <article key={order.id} className="rounded-[1.5rem] bg-cream p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="font-display text-2xl font-extrabold">#{order.id}</h2>
                    <p className="text-sm font-semibold">
                      {order.quantity} {order.quantity === 1 ? "bottle" : "bottles"} · {money(order.amountCents / 100)}
                    </p>
                  </div>
                  <p className="mt-3 text-lg font-semibold">{order.name || "Name missing"}</p>
                  <p className="text-sm text-stone">{[order.email, order.phone].filter(Boolean).join(" · ")}</p>
                  <div className="mt-2 text-sm leading-6">
                    {address(order).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-stone">
                    Placed {when(order.createdAt)}
                    {order.preparedAt ? ` · Prepared ${when(order.preparedAt)}` : ""}
                    {order.shippedAt ? ` · Shipped ${when(order.shippedAt)}` : ""}
                    {order.deliveredAt ? ` · Delivered ${when(order.deliveredAt)}` : ""}
                  </p>
                  {order.trackingNumber ? (
                    <p className="mt-2 text-sm">
                      {order.carrier} {order.service}
                      {order.postageCents ? ` · ${money(order.postageCents / 100)}` : ""} ·{" "}
                      {order.trackingUrl ? (
                        <a className="font-semibold text-brass underline" href={order.trackingUrl} target="_blank" rel="noreferrer">
                          {order.trackingNumber}
                        </a>
                      ) : (
                        order.trackingNumber
                      )}
                    </p>
                  ) : null}
                  {order.holdDetail ? <p className="mt-3 text-sm font-semibold">{order.holdDetail}</p> : null}
                  {order.refundCents > 0 && order.holdKind !== "refund" ? (
                    <p className="mt-2 text-sm">Refunded {money(order.refundCents / 100)}</p>
                  ) : null}
                  {order.labelError && order.status === "placed" ? <p className="mt-3 text-sm text-brass">{order.labelError}</p> : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {order.status === "placed" ? (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        className="h-11 cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold disabled:opacity-60"
                        onClick={() => void prepare(order)}
                      >
                        {busyId === order.id ? "Buying the label…" : "Prepare and print label"}
                      </button>
                    ) : null}
                    {order.labelUrl && order.status !== "placed" ? (
                      <a
                        className="inline-flex h-11 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold"
                        href={order.labelUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Print label
                      </a>
                    ) : null}
                    {order.status === "on_hold" && order.holdKind === "carrier" ? (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        className="h-11 cursor-pointer rounded-full border border-ink/15 px-5 text-sm font-semibold"
                        onClick={() => void release(order)}
                      >
                        Release hold
                      </button>
                    ) : null}
                  </div>
                  {order.status === "prepared" ? (
                    <p className="mt-3 text-sm text-stone">This moves to shipped when the carrier scans it, then to delivered on its own.</p>
                  ) : null}
                  {order.status === "shipped" ? (
                    <p className="mt-3 text-sm text-stone">This moves to delivered when the carrier marks it delivered.</p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `ship-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <label className="text-sm font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-full border border-ink/15 bg-paper px-4 font-normal outline-none"
      />
    </label>
  );
}
