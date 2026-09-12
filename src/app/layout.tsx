import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: {
    default: "Bistro Lumen · POS",
    template: "%s · Bistro Lumen POS",
  },
  description:
    "A modern point-of-sale for restaurants — take orders, track stock, and print receipts from anywhere.",
  manifest: "/manifest.json",
  themeColor: "#1c1814",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
