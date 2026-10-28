import { useEffect } from "react";
import { Link } from "react-router-dom";

export function Thanks() {
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId?.startsWith("cs_")) return;
    void fetch("/api/orders/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  }, []);

  return (
    <article className="bg-paper px-5 pt-28 pb-24 text-ink">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold text-brass">Gold Edition</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-6xl">
          Payment received.
        </h1>
        <p className="mt-5 text-lg leading-7 text-stone">
          If Stripe sent you here, the card was charged and the receipt is in your email. We’ll prepare
          the bottle and ship it to the address you entered. That usually takes 1–3 business days.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-14 items-center rounded-full bg-gold px-7 text-base font-semibold text-ink"
        >
          Back to Dual Sun
        </Link>
      </div>
    </article>
  );
}
