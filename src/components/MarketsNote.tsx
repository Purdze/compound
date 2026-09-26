"use client";

import { dayTime } from "@/lib/format";
import { describeMarkets, type MarketStatus } from "@/lib/market-hours";
import { useAfterMount } from "./useAfterMount";

/** Says when the markets for your holdings are closed, with times in the viewer's timezone. */
export function MarketsNote({ markets }: { markets: MarketStatus[] }) {
  const text = useAfterMount(() => describeMarkets(markets, dayTime), [markets]);
  return text ? <span>{text}</span> : null;
}
