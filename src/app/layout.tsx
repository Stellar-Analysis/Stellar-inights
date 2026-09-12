import React from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-loaded",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
  themeColor: "#080907",
};

export const metadata: Metadata = {
  title: "Stellar Analysis - Payment Network Intelligence",
  description:
    "A living atlas of Stellar payment flows, liquidity, settlement, and trust.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stellar Analysis",
  },
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const locale = headersList.get("x-next-intl-locale") ?? "en";

  return (
    <html
      lang={locale}
      className={`dark ${inter.variable} ${fraunces.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased text-foreground selection:bg-accent/30"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
