import { useState } from "react";
import { Link } from "react-router-dom";
import { BOTTLE_ML, PHONE_DISPLAY, PHONE_TEL, SERVINGS, UNIT_PRICE, money } from "../lib/order";

export function Checkout() {
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const total = quantity * UNIT_PRICE;

  async function pay() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error || "Payment could not start. Call us and we’ll take the order.");
        setPending(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Payment could not start. Call us and we’ll take the order.");
      setPending(false);
    }
  }

  return (
    <article className="bg-paper px-5 pt-28 pb-24 text-ink">
      <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold text-brass">Gold Edition</p>
          <h1 className="mt-2 font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-6xl">
            Checkout
          </h1>
          <div className="mt-8 flex gap-5 rounded-[1.75rem] bg-cream p-4 sm:p-5">
            <img
              src="/images/bottle.png"
              alt="Dual Sun Elixir Gold Edition bottle, matte black glass with a gold cap."
              className="h-40 w-28 shrink-0 rounded-2xl object-cover object-[center_62%] sm:h-48 sm:w-36"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Dual Sun Elixir</h2>
              <p className="mt-1 text-stone">
                {BOTTLE_ML} mL · {SERVINGS} servings
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold">{money(UNIT_PRICE)}</p>
              <div className="mt-auto flex items-center pt-4" role="group" aria-label="Quantity">
                <button
                  type="button"
                  className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-ink/15 bg-white text-xl disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1 || pending}
                  aria-label="Remove one bottle"
                >
                  −
                </button>
                <p className="grid h-11 w-12 place-items-center font-display text-2xl" aria-live="polite">
                  {quantity}
                </p>
                <button
                  type="button"
                  className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-ink/15 bg-white text-xl disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => setQuantity((current) => Math.min(12, current + 1))}
                  disabled={quantity >= 12 || pending}
                  aria-label="Add one bottle"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] bg-white p-6 shadow-[0_20px_50px_rgba(20,18,16,0.08)] md:p-8">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Your order</h2>
          <dl className="mt-6 space-y-3 text-base">
            <div className="flex justify-between gap-4">
              <dt>
                Gold Edition × {quantity}
              </dt>
              <dd>{money(total)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-stone">
              <dt>Ships to</dt>
              <dd>USA and Canada</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-ink/10 pt-4">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-4xl font-extrabold">{money(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-stone">{money(UNIT_PRICE / SERVINGS)} a serving. Leaves in 1–3 business days.</p>

          {error && (
            <p role="alert" className="mt-6 border border-[#8f2d2d]/30 bg-[#f8ecea] p-4 text-sm text-[#6e2424]">
              {error}
            </p>
          )}

          <button
            type="button"
            className="mt-6 h-14 w-full cursor-pointer rounded-full bg-gold text-base font-semibold text-ink transition-colors duration-200 hover:bg-gold-2 disabled:cursor-wait disabled:opacity-70"
            onClick={() => void pay()}
            disabled={pending}
          >
            {pending ? "One moment…" : `Pay ${money(total)}`}
          </button>
          <p className="mt-4 text-sm leading-6 text-stone">
            Or call{" "}
            <a className="text-ink underline" href={`tel:${PHONE_TEL}`}>
              {PHONE_DISPLAY}
            </a>
            .{" "}
            <Link className="text-ink underline" to="/policies">
              Shipping and returns
            </Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
