import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Policies } from "./pages/Policies";
import { Admin } from "./pages/Admin";
import { Checkout } from "./pages/Checkout";
import { Thanks } from "./pages/Thanks";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id) {
      window.scrollTo(0, 0);
      return;
    }
    let frame = 0;
    let attempts = 0;
    const tryScroll = () => {
      const node = document.getElementById(id);
      if (node) {
        node.scrollIntoView({ block: "start" });
        return;
      }
      if (attempts++ < 12) frame = requestAnimationFrame(tryScroll);
    };
    frame = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="admin" element={<Admin />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="policies" element={<Policies />} />
          <Route path="order/thanks" element={<Thanks />} />
          <Route path="*" element={<Missing />} />
        </Route>
      </Routes>
    </>
  );
}

function Missing() {
  return (
    <section className="bg-ink px-6 pt-36 pb-28 text-cream">
      <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Dual Sun</p>
      <h1 className="mt-4 font-display text-6xl leading-none">This page is not on the bench.</h1>
      <a
        href="/"
        className="mt-10 inline-flex h-12 cursor-pointer items-center bg-gold px-7 text-sm tracking-[0.16em] text-ink uppercase"
      >
        Back to the elixir
      </a>
    </section>
  );
}
