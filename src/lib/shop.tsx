import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type ShopCurrency = "usd" | "cad";

type ShopState = {
  unitAmountCents: number;
  currency: ShopCurrency;
  ready: boolean;
};

const fallback: ShopState = { unitAmountCents: 4000, currency: "usd", ready: false };
const ShopContext = createContext<ShopState>(fallback);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [price, setPrice] = useState<ShopState>(fallback);

  useEffect(() => {
    let live = true;
    void fetch("/api/shop")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { unitAmountCents?: unknown; currency?: unknown };
      })
      .then((body) => {
        if (!live || !body) return;
        const cents = Number(body.unitAmountCents);
        const currency = body.currency === "cad" ? "cad" : body.currency === "usd" ? "usd" : null;
        if (!Number.isInteger(cents) || cents < 50 || !currency) return;
        setPrice({ unitAmountCents: cents, currency, ready: true });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pathname]);

  return <ShopContext.Provider value={price}>{children}</ShopContext.Provider>;
}

export function useShop() {
  return useContext(ShopContext);
}
