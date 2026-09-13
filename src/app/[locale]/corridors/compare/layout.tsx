import type { ReactNode } from "react";

// This route fails to statically prerender: something in its component tree
// (via MainLayout's header) throws "useNotifications must be used within a
// NotificationProvider" during static generation, a pre-existing issue
// unrelated to enabling static rendering elsewhere. Keeping it dynamic here
// preserves its previous (working) request-time rendering behavior without
// blocking the rest of the app from being statically generated.
export const dynamic = "force-dynamic";

export default function CorridorsCompareLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
