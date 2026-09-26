"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY_MS = 3000;

/** Re-renders the page every few seconds while the server is still preparing its data. */
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
