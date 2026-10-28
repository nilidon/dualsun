import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PHONE_DISPLAY, PHONE_TEL, money, scrollToId, UNIT_PRICE } from "../lib/order";
import { SunMark } from "./SunMark";

const links = [
  { id: "why", label: "Why it sold" },
  { id: "formula", label: "Formula" },
  { id: "ritual", label: "How to take it" },
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ghost = location.pathname === "/" && !lifted && !menuOpen;
  const hideOrderBar = menuOpen || location.pathname === "/checkout" || location.pathname === "/order/thanks";

  function goTo(id: string) {
    setMenuOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    scrollToId(id);
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-gold focus:px-4 focus:py-3 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="fixed inset-x-0 top-0 z-50">
        <header
          className={`border-b transition-colors duration-300 ${ghost ? "border-transparent bg-transparent text-cream" : "border-ink/10 bg-paper/95 text-ink backdrop-blur-md"}`}
        >
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Dual Sun Elixir, home">
              <SunMark className={`h-8 w-8 ${ghost ? "text-gold" : "text-brass"}`} />
              <span className="font-display text-lg font-extrabold tracking-tight">Dual Sun</span>
            </Link>
            <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={`/#${link.id}`}
                  className={`cursor-pointer text-sm font-medium transition-colors duration-200 ${ghost ? "text-cream/80 hover:text-cream" : "text-stone hover:text-ink"}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(link.id);
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                to="/checkout"
                className="hidden h-11 cursor-pointer items-center rounded-full bg-gold px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-gold-2 md:inline-flex"
              >
                Order · {money(UNIT_PRICE)}
              </Link>
              <button
                type="button"
                className={`grid h-11 w-11 cursor-pointer place-items-center rounded-full border md:hidden ${ghost ? "border-cream/30 text-cream" : "border-ink/15 text-ink"}`}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
                <span aria-hidden="true" className="flex w-4 flex-col gap-1.5">
                  <span className="block h-px bg-current" />
                  <span className="block h-px bg-current" />
                  <span className="block h-px bg-current" />
                </span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="fixed inset-0 z-40 bg-paper px-6 pt-24 text-ink md:hidden">
          <nav className="flex flex-col gap-5" aria-label="Mobile">
            {links.map((link) => (
              <a
                key={link.id}
                href={`/#${link.id}`}
                className="font-display text-5xl"
                onClick={(event) => {
                  event.preventDefault();
                  goTo(link.id);
                }}
              >
                {link.label}
              </a>
            ))}
            <Link to="/checkout" className="font-display text-5xl" onClick={() => setMenuOpen(false)}>
              Order
            </Link>
            <Link to="/policies" className="font-display text-5xl" onClick={() => setMenuOpen(false)}>
              Policies
            </Link>
            <a href={`tel:${PHONE_TEL}`} className="mt-6 text-base text-brass">
              Call {PHONE_DISPLAY}
            </a>
          </nav>
        </div>
      )}

      <main id="main">
        <Outlet />
      </main>

      <footer className="border-t border-ink/10 bg-paper px-5 pt-14 pb-28 text-stone md:pb-12">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <SunMark className="h-9 w-9 text-brass" />
            <p className="mt-4 max-w-sm text-sm leading-6">
              A honey preparation of ginger, turmeric, lemon, and black pepper. Food, composed as a
              daily ritual. Enjoy it as part of a balanced diet.
            </p>
          </div>
          <div className="text-sm leading-7">
            <p className="text-xs text-brass">Visit</p>
            <a className="mt-3 block text-ink hover:text-brass" href={`mailto:info@dualsunelixir.com`}>
              info@dualsunelixir.com
            </a>
            <a className="block text-ink hover:text-brass" href={`tel:${PHONE_TEL}`}>
              {PHONE_DISPLAY}
            </a>
            <p>Ships in the USA and Canada</p>
          </div>
          <div className="text-sm leading-7">
            <p className="text-xs text-brass">House</p>
            <Link className="mt-3 block text-ink hover:text-brass" to="/checkout">
              Checkout
            </Link>
            <a
              className="block text-ink hover:text-brass"
              href="/#formula"
              onClick={(event) => {
                event.preventDefault();
                goTo("formula");
              }}
            >
              Formula
            </a>
            <Link className="block text-ink hover:text-brass" to="/policies">
              Privacy, shipping, returns
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-[1200px] flex-col gap-2 border-t border-ink/10 pt-6 text-xs md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Dual Sun Elixir</p>
          <p>Do not give honey to infants under 12 months.</p>
        </div>
      </footer>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 px-4 py-3 text-ink backdrop-blur-md md:hidden ${hideOrderBar ? "hidden" : ""}`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-brass">Gold Edition</p>
            <p>{money(UNIT_PRICE)} · 250 mL</p>
          </div>
          <Link
            to="/checkout"
            className="inline-flex h-14 cursor-pointer items-center rounded-full bg-gold px-6 text-base font-semibold text-ink"
          >
            Order
          </Link>
        </div>
      </div>
    </>
  );
}
