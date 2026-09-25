"use client";

import { useEffect, useState } from "react";

/**
 * Computes a value in the browser only. For anything that depends on the viewer's
 * clock or timezone: the server runs in UTC, and hydration keeps server-rendered
 * text rather than re-rendering it. Returns null until mounted.
 */
export function useAfterMount<T>(compute: () => T, deps: unknown[]): T | null {
  const [value, setValue] = useState<T | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setValue(compute()), deps);
  return value;
}
