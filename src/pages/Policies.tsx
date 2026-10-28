import { ORDER_EMAIL, PHONE_DISPLAY, PHONE_TEL } from "../lib/order";

const sections = [
  {
    id: "privacy",
    title: "Privacy",
    updated: "March 2026",
    blocks: [
      "Dual Sun respects your privacy and is committed to protecting the personal information of visitors and customers.",
      "Checkout is handled by Stripe. Stripe collects your name, email, phone, delivery address, and payment details. Dual Sun does not see or store your card number.",
      "Stripe’s privacy policy describes how they handle that payment information. A shipping carrier receives the address needed to deliver the package. Your phone carrier connects a call if you phone us. Those parties only need the information required to do that work.",
      "This website does not set advertising or analytics cookies.",
    ],
  },
  {
    id: "shipping",
    title: "Shipping",
    updated: "March 2026",
    blocks: [
      "Every order is prepared and handed off with care.",
      "Orders are typically processed within 1–3 business days. Orders placed on weekends or holidays are processed on the next business day.",
      "We ship within the United States and Canada.",
      "Delivery times vary by destination and carrier. Those times are estimates. Carrier delays and weather can change them.",
      "When tracking is available, we send it once the order has shipped.",
      "Once a package has been transferred to the carrier, Dual Sun is not responsible for delivery delays caused by the carrier.",
      "You are responsible for the accuracy of the shipping address. We cannot guarantee delivery if the address provided at checkout is wrong.",
    ],
  },
  {
    id: "returns",
    title: "Returns",
    updated: "March 2026",
    blocks: [
      "Because this is a food product, we are unable to accept returns.",
      "If your order arrives damaged or incorrect, contact us within 48 hours of delivery. Include the order details, photos of the product, and photos of the packaging.",
      "After review, we may offer a replacement.",
    ],
  },
];

export function Policies() {
  return (
    <article className="bg-paper px-5 pt-28 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] tracking-[0.28em] text-brass uppercase">Dual Sun Elixir</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.92] md:text-7xl">Policies</h1>
        <p className="mt-6 text-lg leading-8 text-stone">
          Privacy, shipping, and returns. The product is food, meant to be enjoyed as part of a
          balanced diet and lifestyle. Do not give honey to infants under 12 months.
        </p>
        <nav className="mt-8 flex flex-wrap gap-4 text-sm tracking-[0.16em] uppercase" aria-label="Policies">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-brass underline-offset-4 hover:underline">
              {section.title}
            </a>
          ))}
        </nav>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 mt-16 border-t border-ink/15 pt-8">
            <h2 className="font-display text-4xl">{section.title}</h2>
            <p className="mt-2 text-[12px] tracking-[0.18em] text-brass uppercase">
              Last updated {section.updated}
            </p>
            <div className="mt-6 space-y-4 text-base leading-7 text-stone">
              {section.blocks.map((block) => (
                <p key={block}>{block}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-16 border-t border-ink/15 pt-8">
          <h2 className="font-display text-4xl">Contact</h2>
          <div className="mt-4 space-y-1 text-base leading-7 text-stone">
            <p>Dual Sun</p>
            <p>
              <a className="text-ink underline" href={`mailto:${ORDER_EMAIL}`}>
                {ORDER_EMAIL}
              </a>
            </p>
            <p>
              <a className="text-ink underline" href="mailto:dualsun.elixir@gmail.com">
                dualsun.elixir@gmail.com
              </a>
            </p>
            <p>
              <a className="text-ink underline" href={`tel:${PHONE_TEL}`}>
                {PHONE_DISPLAY}
              </a>
            </p>
            <p>dualsunelixir.com</p>
          </div>
        </section>
      </div>
    </article>
  );
}
