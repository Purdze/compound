"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { versionTag } from "@/lib/version";
import { Button, WHATS_NEW, linkClass } from "./ui";

export function UpdatedNotice({ version }: { version: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  // The What's new page marks the version as seen as it renders.
  if (hidden || pathname === WHATS_NEW) return null;

  async function dismiss() {
    setHidden(true);
    await apiRequest("/api/whats-new/seen", "", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-rule py-3 text-sm" role="status">
      <span>Compound has been updated to {versionTag(version)}.</span>
      <Link href={WHATS_NEW} className={linkClass}>
        See what&apos;s new
      </Link>
      <Button variant="quiet" onClick={dismiss}>
        Dismiss
      </Button>
    </div>
  );
}
