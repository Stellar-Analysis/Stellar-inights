import { useCallback, useRef } from "react";

/**
 * Returns a function whose identity never changes across renders, while
 * always invoking the latest version of `fn` (including whatever it closes
 * over). Use this for callbacks handed to a hook whose own effects key off
 * the callback's identity (e.g. useWebSocket's onOpen/onClose/onError) when
 * the callback itself needs to read values - like another return value from
 * that same hook - that aren't available until after the hook call, which
 * rules out a plain useCallback with a real dependency array.
 */
export function useStableCallback<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback((...args: Args) => fnRef.current(...args), []);
}
