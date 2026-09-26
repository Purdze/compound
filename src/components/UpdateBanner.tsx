"use client";

import { useEffect, useState } from "react";
import type { UpdateInfo } from "@/lib/updates";
import { versionTag } from "@/lib/version";
import { Button, ExternalLink } from "./ui";
import { UpdateCommand } from "./UpdateCommand";

const DISMISSED_KEY = "compound:dismissed-update";

export function UpdateBanner({ update }: { update: UpdateInfo }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISSED_KEY) === update.version);
    } catch {
      setHidden(false);
    }
  }, [update.version]);

  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, update.version);
    } catch {}
    setHidden(true);
  }

  return (
    <div className="border-b border-rule py-3 text-sm" role="status">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span>
          Compound {versionTag(update.version)} is available. You&apos;re on {versionTag(update.current)}.
        </span>
        <ExternalLink href={update.url}>What&apos;s new</ExternalLink>
        <Button variant="quiet" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
      <div className="mt-2">
        <UpdateCommand />
      </div>
    </div>
  );
}
