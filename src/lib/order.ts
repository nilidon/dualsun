export const UNIT_PRICE = 40;
export const BOTTLE_ML = 250;
export const SERVING_ML = 10;
export const SERVINGS = BOTTLE_ML / SERVING_ML;
export const ORDER_EMAIL = "info@dualsunelixir.com";
export const PHONE_DISPLAY = "(416) 613-2398";
export const PHONE_TEL = "+14166132398";

export function money(amount: number) {
  const cents = Math.round(amount * 100);
  const body = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  return `$${body}`;
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}
