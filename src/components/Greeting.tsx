"use client";

import { useAfterMount } from "./useAfterMount";

function partOfDay(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function Greeting({ name }: { name: string }) {
  const text = useAfterMount(() => `Good ${partOfDay(new Date().getHours())}, ${name}.`, [name]);
  return <p className="min-h-6 text-ink-muted">{text}</p>;
}
