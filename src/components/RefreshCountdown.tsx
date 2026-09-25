"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { apiRequest } from "@/lib/client-api";
import { Button } from "./ui";

type Props = {
  /** From nextPortfolioRefresh(): `at` identifies this batch of data, `inMs` is measured on the server. */
  next: { at: number; inMs: number };
  countdownLabel?: string;
  buttonLabel?: string;
};

/**
 * Counts down to the server's next data refresh and reloads the page when it's due,
 * while the tab is visible. The button forces a refresh now.
 */
export function RefreshCountdown({ next, countdownLabel = "Updates", buttonLabel = "Refresh" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  // Anchored to the browser's clock on arrival, so client/server clock skew doesn't matter.
  const due = useRef(0);
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    due.current = Date.now() + next.inMs;
    setNow(Date.now());

    // Reload is driven by its own timer and by the tab becoming visible, not the display
    // tick: browsers throttle intervals in background tabs.
    const reloadIfDue = () => {
      if (document.visibilityState !== "visible" || Date.now() < due.current || firedFor.current === next.at) return;
      firedFor.current = next.at;
      start(() => router.refresh());
    };
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const timer = setTimeout(reloadIfDue, next.inMs);
    document.addEventListener("visibilitychange", reloadIfDue);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", reloadIfDue);
    };
  }, [next.at, next.inMs, router]);

  function refreshNow() {
    start(async () => {
      await apiRequest("/api/portfolio", "", { method: "POST" });
      router.refresh();
    });
  }

  const seconds = now === null ? null : Math.max(0, Math.ceil((due.current - now) / 1000));

  return (
    <>
      <span className="tabular-nums">
        {pending || seconds === 0 ? "Updating…" : seconds !== null && `${countdownLabel} in ${seconds}s`}
      </span>
      <Button variant="quiet" disabled={pending} onClick={refreshNow}>
        {buttonLabel}
      </Button>
    </>
  );
}
