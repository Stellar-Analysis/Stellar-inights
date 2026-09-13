"use client";

import { useEffect } from "react";

/**
 * Keeps <html lang> in sync with the active locale on the client.
 * The root layout can't read the locale itself without forcing every
 * route into dynamic rendering (see src/app/layout.tsx), so this fills
 * in the correct value after hydration instead.
 */
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
