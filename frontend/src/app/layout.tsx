import React from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

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
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className="font-sans antialiased text-foreground selection:bg-accent/30"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
