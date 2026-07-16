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
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
