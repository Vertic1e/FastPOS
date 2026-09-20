import { useEffect, useState } from "react";

/**
 * Layout-mode media queries.
 * Keep these in sync with the @custom-variant definitions in index.css.
 */
export const MQ = {
  /** Catalog and ticket side by side (tablet portrait and up, with enough height). */
  split: "(min-width: 768px) and (min-height: 560px)",
  /** Left navigation rail instead of bottom tab bar. */
  rail: "(min-width: 1024px), (orientation: landscape) and (max-height: 520px)",
  /** Dialogs render as bottom sheets. */
  sheet: "(max-width: 639.98px), (max-height: 520px)",
  /** Very little vertical room (landscape phones). */
  short: "(max-height: 520px)",
  /** Touch-first device. */
  coarse: "(pointer: coarse)",
} as const;

export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState<boolean>(get);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

export const useIsSplit = () => useMediaQuery(MQ.split);
export const useIsRail = () => useMediaQuery(MQ.rail);
export const useIsSheet = () => useMediaQuery(MQ.sheet);
export const useIsShort = () => useMediaQuery(MQ.short);
export const useIsCoarsePointer = () => useMediaQuery(MQ.coarse);
