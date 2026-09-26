"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { money, time } from "@/lib/format";
import type { VuagPrice } from "@/lib/t212/portfolio";

const REFRESH_MS = 60_000;

/** Shown only when the owner holds VUAG; otherwise renders nothing. */
export function VuagTicker() {
  const [vuag, setVuag] = useState<VuagPrice | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await apiRequest<{ vuag: VuagPrice | null }>("/api/ticker/vuag", "");
      if (!cancelled) setVuag(res.ok ? res.data.vuag : null);
    }
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!vuag) return null;
  const asOf = time(vuag.asOf);
  return (
    <div className="text-sm" aria-live="polite" title={`As of ${asOf}`}>
      <span className="font-medium">VUAG</span>{" "}
      <span className="figure">{money(vuag.price, vuag.currency ?? undefined)}</span>{" "}
      <span className="text-ink-muted">
        at {asOf.slice(0, 5)}
        {vuag.marketOpen === false && " · market closed"}
      </span>
    </div>
  );
}
