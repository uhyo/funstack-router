import { Suspense } from "react";
import { Outlet } from "@funstack/router";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { ScrollToTop } from "./ScrollToTop.js";

export function Layout() {
  return (
    <div className="layout">
      <ScrollToTop />
      <Header />
      <main className="main">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
