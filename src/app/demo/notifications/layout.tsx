import type { ReactNode } from "react";

// This demo page sits outside the [locale] tree, so it lacks the
// NotificationProvider ancestor its content depends on — broken
// independent of this fix. Keeping it dynamic preserves its previous
// behavior instead of also failing at build time.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
