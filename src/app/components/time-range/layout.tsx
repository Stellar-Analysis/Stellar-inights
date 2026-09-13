import type { ReactNode } from "react";

// This demo page sits outside the [locale] tree, so it has never had a
// WalletProvider/NotificationProvider ancestor for MainLayout's Header to
// read from — broken independent of this fix. Keeping it dynamic preserves
// its previous (working, in the sense of "never statically checked")
// request-time behavior instead of also failing at build time.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
