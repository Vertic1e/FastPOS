/** Coerce drizzle numeric (string) to number safely. */
export function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const parsed = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(v: number | string | null | undefined, currency = "$") {
  const value = n(v);
  return `${currency}${value.toFixed(2)}`;
}

export function khr(v: number | string | null | undefined, rate = 4000, symbol = "៛") {
  const value = Math.round(n(v) * rate);
  return `${value.toLocaleString("en-US")} ${symbol}`;
}

export function usdToKhr(usd: number | string | null | undefined, rate = 4000) {
  return Math.round(n(usd) * rate);
}

export function khrToUsd(khrAmount: number | string | null | undefined, rate = 4000) {
  return round2(n(khrAmount) / (rate || 4000));
}

export function dualPrice(
  v: number | string | null | undefined,
  rate = 4000,
  primary = "$",
  secondary = "៛",
) {
  const value = n(v);
  const khrValue = Math.round(value * (rate || 4000));
  return {
    usd: `${primary}${value.toFixed(2)}`,
    khr: `${khrValue.toLocaleString("en-US")} ${secondary}`,
    combined: `${primary}${value.toFixed(2)} · ${khrValue.toLocaleString("en-US")} ${secondary}`,
  };
}

export function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtDateTime(d: Date) {
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}

export function dayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function startOfDay(d = new Date()) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Deterministic pseudo-random generator for stable seeding. */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
