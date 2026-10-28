import { useNavigate } from "react-router-dom";
import { money, UNIT_PRICE, SERVINGS, SERVING_ML, BOTTLE_ML, PHONE_DISPLAY, PHONE_TEL } from "../lib/order";

const ingredients = [
  {
    name: "Honey",
    role: "The base",
    copy: "The spoon starts here. Everything else is held in it.",
    tone: "bg-[#e8a317]",
  },
  {
    name: "Turmeric",
    role: "The colour",
    copy: "The gold you see in the glass. Aroma, on purpose.",
    tone: "bg-[#d46a1e]",
  },
  {
    name: "Black pepper",
    role: "The balance",
    copy: "Stops the louder ingredients from taking the spoon.",
    tone: "bg-[#2a241c]",
  },
  {
    name: "Ginger",
    role: "The heat",
    copy: "Depth you taste. Kept in proportion to the honey.",
    tone: "bg-[#c47a3a]",
  },
  {
    name: "Lemon",
    role: "The finish",
    copy: "Brightness at the end, so the sweetness moves.",
    tone: "bg-[#e6c15a]",
  },
];

const ticker = [
  "Honey",
  "Ginger",
  "Turmeric",
  "Lemon",
  "Black pepper",
  "4,000 sold",
  "$40",
  "25 mornings",
  "USA and Canada",
];

const why = [
  {
    title: "The taste sells it",
    copy: "Honey first, then ginger heat, turmeric gold, and lemon at the end. Black pepper keeps it sharp. One spoon is enough to understand the $40.",
  },
  {
    title: "Two teaspoons. Done.",
    copy: "From the spoon, in warm water, or in tea. No recipe and no row of jars. The bottle is 25 mornings.",
  },
  {
    title: "4,000 people already paid",
    copy: "No ads. Someone bought it, liked the spoon, and put the next bottle in someone else’s hands. That is how every one of them sold.",
  },
];

const methods = [
  { n: "01", title: "From the spoon", copy: "Two teaspoons, straight. Ten millilitres." },
  { n: "02", title: "In warm water", copy: "Stir until the honey lets go." },
  { n: "03", title: "In your tea", copy: "Add it to the cup you already drink." },
];

const questions = [
  {
    q: "What am I actually buying?",
    a: "A 250 mL bottle of Dual Sun Elixir, Gold Edition. Honey, ginger, turmeric, lemon, and black pepper, measured to the same specification every batch. It is food, for a balanced diet. It is not a medicine.",
  },
  {
    q: "How do I take it?",
    a: `Take 2 teaspoons (${SERVING_ML} mL), one to three times a day. From the spoon, stirred into warm water, or in tea. Shake gently before you pour.`,
  },
  {
    q: "How long does $40 last?",
    a: `The bottle is ${BOTTLE_ML} mL, which is ${SERVINGS} servings. Once a day, twenty-five days. Twice a day, about twelve. Three times a day, about eight.`,
  },
  {
    q: "Where do you ship?",
    a: "The United States and Canada. Orders are prepared in 1–3 business days. Delivery time depends on the carrier and where it is going.",
  },
  {
    q: "When do I pay?",
    a: "At checkout, before the bottle ships.",
  },
  {
    q: "Can I send it back?",
    a: "No. This is food, so we cannot accept returns. If it arrives damaged or incorrect, write within 48 hours with photos of the bottle and the packaging. After review, we may send a replacement.",
  },
  {
    q: "Who should skip it?",
    a: "Do not give honey to infants under 12 months. If you have a known sensitivity to honey, ginger, turmeric, black pepper, or citrus, read the ingredients before you order.",
  },
];

export function Home() {
  const navigate = useNavigate();
  function orderNow() {
    navigate("/checkout");
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Dual Sun Elixir Gold Edition",
    image: "https://dualsunelixir.com/images/bottle.png",
    description:
      "Honey, ginger, turmeric, lemon, and black pepper. 250 mL Gold Edition. $40 USD. 25 servings.",
    brand: { "@type": "Brand", name: "Dual Sun Elixir" },
    sku: "DSE-GOLD-250",
    size: "250 mL",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "40.00",
      availability: "https://schema.org/InStock",
      url: "https://dualsunelixir.com/checkout",
      areaServed: [
        { "@type": "Country", name: "United States" },
        { "@type": "Country", name: "Canada" },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />

      <section className="relative bg-ink text-cream lg:min-h-[100svh]">
        <img
          src="/images/bottle.png"
          alt="Dual Sun Elixir Gold Edition bottle: matte black glass, gold cap, gold sun emblem, honey-gold liquid."
          className="h-[38svh] w-full object-cover object-[center_46%] lg:absolute lg:inset-0 lg:h-full lg:object-[center_42%]"
          fetchPriority="high"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/80 to-transparent" />
        <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(80%_70%_at_0%_100%,rgba(20,18,16,0.9),transparent_50%)] lg:block" />

        <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col justify-end px-5 pt-6 pb-28 sm:px-10 lg:min-h-[100svh] lg:pb-14">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-gold sm:text-xs sm:tracking-[0.16em] sm:uppercase">
              Gold Edition · 4,000 sold by word of mouth
            </p>
            <h1 className="mt-3 font-display text-[2.9rem] leading-[0.88] font-extrabold tracking-[-0.045em] sm:text-7xl lg:text-[6.5rem]">
              25 mornings.
              <span className="block">One bottle.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-cream/80 sm:text-lg">
              Honey, ginger, turmeric, lemon, and black pepper.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex h-14 cursor-pointer items-center justify-center rounded-full bg-gold px-7 text-base font-semibold text-ink transition-colors duration-200 hover:bg-gold-2"
                onClick={orderNow}
              >
                Order the Gold Edition
              </button>
              <a
                href={`tel:${PHONE_TEL}`}
                className="inline-flex h-11 cursor-pointer items-center text-base font-medium text-cream sm:h-14 sm:justify-center sm:rounded-full sm:border sm:border-cream/25 sm:px-6"
              >
                Call {PHONE_DISPLAY}
              </a>
            </div>
            <p className="mt-2 max-w-sm text-sm leading-6 text-cream/70 sm:mt-5">
              {money(UNIT_PRICE / SERVINGS)} a serving · USA and Canada · Leaves in 1–3 days
            </p>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-white/10 bg-ink py-4 text-cream" aria-hidden="true">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <p key={copy} className="flex shrink-0 items-center gap-8 pr-8 font-display text-lg font-semibold tracking-tight">
              {ticker.map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center gap-8">
                  {item}
                  <span className="text-gold">·</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <section id="why" className="scroll-mt-24 bg-paper px-5 py-16 text-ink sm:px-10 md:py-24">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-sm font-semibold text-brass">Why it sells</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-6xl">
            Taste it once. Then you want the bottle.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-stone">
            Honey, ginger, turmeric, lemon, and black pepper. {money(UNIT_PRICE)} for {SERVINGS} mornings.
            Food, taken with breakfast. Not a medicine.
          </p>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {why.map((item, index) => (
              <li key={item.title} className="rounded-[1.5rem] bg-cream p-6">
                <p className="font-display text-sm font-extrabold text-brass">0{index + 1}</p>
                <h3 className="mt-4 font-display text-3xl font-extrabold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-base leading-7 text-stone">{item.copy}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="mt-8 inline-flex h-14 cursor-pointer items-center justify-center rounded-full bg-gold px-7 text-base font-semibold text-ink hover:bg-gold-2"
            onClick={orderNow}
          >
            Order the Gold Edition
          </button>
        </div>
      </section>

      <section className="bg-ink px-5 py-20 text-cream sm:px-10 md:py-28">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <h2 className="max-w-3xl font-display text-4xl leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-6xl">
              Someone tasted it and handed the next bottle over.
            </h2>
            <button
              type="button"
              className="h-12 w-fit cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold text-ink"
              onClick={orderNow}
            >
              Get it for {money(UNIT_PRICE)}
            </button>
          </div>
          <dl className="mt-16 grid gap-12 border-t border-white/10 pt-10 md:grid-cols-3 md:gap-8">
            <div>
              <dt className="font-display text-7xl font-extrabold tracking-[-0.04em] sm:text-8xl">4,000</dt>
              <dd className="mt-3 max-w-[18ch] text-base text-mist">Bottles sold by people, not ads.</dd>
            </div>
            <div>
              <dt className="font-display text-7xl font-extrabold tracking-[-0.04em] sm:text-8xl">{money(UNIT_PRICE / SERVINGS)}</dt>
              <dd className="mt-3 max-w-[18ch] text-base text-mist">What one morning costs. The bottle is {money(UNIT_PRICE)}.</dd>
            </div>
            <div>
              <dt className="font-display text-7xl font-extrabold tracking-[-0.04em] sm:text-8xl">{SERVING_ML} mL</dt>
              <dd className="mt-3 max-w-xs text-base text-mist">Take two teaspoons straight, stirred into warm water, or added to tea.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-paper text-ink lg:grid lg:grid-cols-2">
        <div className="lg:sticky lg:top-0 lg:h-screen">
          <img
            src="/images/photo-2678.jpg"
            alt="Overhead view of the Gold Edition beside a gold spoon on a black tray scattered with gold."
            className="h-[58svh] w-full object-cover object-center lg:h-full"
          />
        </div>
        <div id="formula" className="scroll-mt-24 px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
          <p className="text-sm font-semibold text-brass">The formula</p>
          <h2 className="mt-3 max-w-md font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-6xl">
            Five ingredients. Nothing extra.
          </h2>
          <ol className="mt-12">
            {ingredients.map((item) => (
              <li key={item.name} className="border-t border-ink/10 py-7">
                <div className="flex items-baseline justify-between gap-6">
                  <h3 className="flex items-center gap-3 font-display text-4xl font-extrabold tracking-tight">
                    <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />
                    {item.name}
                  </h3>
                  <p className="text-sm font-semibold text-brass">{item.role}</p>
                </div>
                <p className="mt-2 max-w-md text-stone">{item.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="ritual" className="relative scroll-mt-24 bg-ink text-cream lg:min-h-[100svh]">
        <img
          src="/images/photo-2682.jpg"
          alt="The Gold Edition bottle on blue-gray stone, black fabric around it, honey-gold liquid in the glass."
          className="aspect-[3/2] w-full object-cover object-[center_42%] lg:absolute lg:inset-0 lg:aspect-auto lg:h-full lg:object-[center_30%]"
        />
        <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(20,18,16,0.88)_0%,rgba(20,18,16,0.5)_36%,transparent_58%)] lg:block" />
        <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col justify-end px-5 py-12 sm:px-10 lg:min-h-[100svh] lg:justify-center lg:py-14">
          <div className="max-w-md">
            <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">How you take it</p>
            <h2 className="mt-3 font-display text-5xl leading-[0.92] font-extrabold tracking-[-0.04em] sm:text-6xl">
              Two teaspoons. Then you’re done.
            </h2>
            <p className="mt-4 text-lg leading-7 text-cream/75">
              {SERVING_ML} mL, one to three times a day. Shake it first. The honey settles; the formula should not.
            </p>
            <ol className="mt-8">
              {methods.map((method) => (
                <li key={method.n} className="grid grid-cols-[3rem_1fr] gap-3 border-t border-cream/15 py-4">
                  <span className="font-display text-xl font-extrabold text-gold">{method.n}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{method.title}</h3>
                    <p className="text-cream/70">{method.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-cream/70">
              {BOTTLE_ML} mL · 25 days at one spoon · {money(UNIT_PRICE / SERVINGS)} a serving
            </p>
          </div>
        </div>
      </section>

      <section className="relative bg-ink lg:min-h-[100svh]">
        <img
          src="/images/photo-2657.jpg"
          alt="The Gold Edition between two black boxes lettered dream and inspire."
          className="aspect-[3/2] w-full object-cover object-center lg:absolute lg:inset-0 lg:aspect-auto lg:h-full"
        />
        <div className="relative z-10 flex flex-col items-start gap-5 bg-ink px-5 pt-6 pb-28 sm:px-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex-row lg:items-end lg:justify-between lg:bg-gradient-to-t lg:from-ink/80 lg:via-ink/20 lg:to-transparent lg:pt-28 lg:pb-10">
          <p className="max-w-xs font-display text-3xl leading-none font-extrabold tracking-tight text-cream sm:text-4xl">
            The bottle people pass on.
          </p>
          <button
            type="button"
            className="inline-flex h-14 shrink-0 cursor-pointer items-center rounded-full bg-gold px-6 text-sm font-semibold text-ink sm:text-base"
            onClick={orderNow}
          >
            Order · {money(UNIT_PRICE)}
          </button>
        </div>
      </section>

      <section id="questions" className="scroll-mt-24 bg-paper px-5 py-16 sm:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <h2 className="font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.04em]">Before you order</h2>
            <button
              type="button"
              className="mt-6 hidden h-12 cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold text-ink md:inline-flex md:items-center"
              onClick={orderNow}
            >
              Order · {money(UNIT_PRICE)}
            </button>
          </div>
          <div>
            {questions.map((item) => (
              <details key={item.q} className="group border-b border-ink/10 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium">
                  <span>{item.q}</span>
                  <span aria-hidden="true" className="text-2xl text-brass group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pt-2 pr-8 leading-7 text-stone">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-5 py-24 text-cream sm:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <h2 className="max-w-3xl font-display text-5xl leading-[0.92] font-extrabold tracking-[-0.045em] sm:text-7xl">
            If someone handed you this, you already get it.
          </h2>
          <div className="shrink-0">
            <p className="mb-4 max-w-xs text-lg text-mist">
              If they didn’t, start with one bottle. {money(UNIT_PRICE)}. USA and Canada.
            </p>
            <button
              type="button"
              className="inline-flex h-14 cursor-pointer items-center rounded-full bg-gold px-7 text-base font-semibold text-ink hover:bg-gold-2"
              onClick={orderNow}
            >
              Order the Gold Edition
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
