import type { Metadata } from "next";
import { Heebo, Montserrat } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const heebo = Heebo({ subsets: ["latin"], variable: "--font-heebo", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: "Lumin — The Operating System for Movement",
  description: "Grounded AI for fitness: intelligent, interactive, individualized.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heebo.variable} ${montserrat.variable}`}>
      <head>
        {/*
          Kill scroll restoration BEFORE the browser can restore.
          SmoothScroll already sets this, but it runs in an effect — by then
          Chrome has restored the previous scrollY, which on a refresh dropped
          the visitor straight into the middle of the ecosystem idle loop with
          none of the journey behind it. This has to be inline and in <head> so
          it executes before first paint. `beforeunload` clears the position the
          browser would otherwise cache for a same-page reload.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if("scrollRestoration" in history)history.scrollRestoration="manual";' +
              'window.addEventListener("beforeunload",function(){window.scrollTo(0,0)});',
          }}
        />
      </head>
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
