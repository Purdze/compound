const cache = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, decimals: number) {
  const key = `${currency}:${decimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    cache.set(key, f);
  }
  return f;
}

export function money(value: number, currency = "GBP", decimals = 2): string {
  try {
    return formatter(currency, decimals).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${currency}`;
  }
}

export const wholeGBP = (value: number) => money(value, "GBP", 0);

export function compactGBP(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `£${+(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `£${+(value / 1_000).toFixed(1)}k`;
  return `£${Math.round(value)}`;
}

export function signedMoney(value: number, currency = "GBP"): string {
  const s = money(Math.abs(value), currency);
  return value < 0 ? `−${s}` : value > 0 ? `+${s}` : s;
}

export function quantity(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 6 }).format(value);
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** `Mon 08:00`, in the viewer's timezone. */
export function dayTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export function dateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function signedPercent(fraction: number): string {
  const s = `${Math.abs(fraction * 100).toFixed(1)}%`;
  return fraction < 0 ? `−${s}` : fraction > 0 ? `+${s}` : s;
}

const utcDate = (iso: string, parts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { ...parts, timeZone: "UTC" });

/** `2026-09` → `Sep 2026`. */
export const monthLabel = (month: string) => utcDate(`${month}-01`, { month: "short", year: "numeric" });

/** `2026-09-26` → `26 Sep 2026`. */
export const dayLabel = (day: string) => utcDate(day, { day: "numeric", month: "short", year: "numeric" });
