"use client";

import { dateTime, time } from "@/lib/format";
import { useAfterMount } from "./useAfterMount";

export function LocalTime({ iso, withDate = false }: { iso: string; withDate?: boolean }) {
  const text = useAfterMount(() => (withDate ? dateTime(iso) : time(iso)), [iso, withDate]);
  return <time dateTime={iso}>{text ?? "…"}</time>;
}
