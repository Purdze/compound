"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import type { UpdateCheck as Result } from "@/lib/updates";
import { Button, Notice } from "../ui";
import { UpdateDetails } from "../UpdateDetails";

export function UpdateCheck() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | { status: "error"; message: string } | null>(null);

  async function check() {
    setChecking(true);
    const res = await apiRequest<Result>("/api/updates", "Couldn't check for updates. Try again.", { method: "POST" });
    setChecking(false);
    setResult(res.ok ? res.data : { status: "error", message: res.error });
    if (res.ok && res.data.status === "update") router.refresh();
  }

  return (
    <>
      <Button variant="quiet" onClick={check} disabled={checking}>
        {checking ? "Checking…" : "Check for updates"}
      </Button>
      {result && (
        <div className="mt-4 max-w-2xl space-y-3">
          {result.status === "latest" && <Notice tone="success">You&apos;re on the latest version.</Notice>}
          {result.status === "update" && (
            <Notice>
              <UpdateDetails update={result.update} />
            </Notice>
          )}
          {result.status === "failed" && (
            <Notice tone="problem">Couldn&apos;t reach GitHub to check for updates. Try again in a few minutes.</Notice>
          )}
          {result.status === "error" && <Notice tone="problem">{result.message}</Notice>}
        </div>
      )}
    </>
  );
}
