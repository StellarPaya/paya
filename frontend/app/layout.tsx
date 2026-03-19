import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paya — Stripe for crypto payments",
  description:
    "Open-source crypto payment infrastructure that accepts BTC, ETH, USDC, and XLM, settles as USDC on Stellar, and supports payouts, escrow, splits, and subscriptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-emerald-500/20 selection:text-zinc-900 dark:selection:text-zinc-50`}
      >
        {children}
      </body>
    </html>
  );
}
