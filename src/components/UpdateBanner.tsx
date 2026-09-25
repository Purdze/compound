"use client";

import { useEffect, useState } from "react";
import type { UpdateInfo } from "@/lib/updates";
import { versionTag } from "@/lib/version";
import { Button, ExternalLink } from "./ui";

const DISMISSED_KEY = "compound:dismissed-update";
const COMMAND = "docker compose pull && docker compose up -d";

export function UpdateBanner({ update }: { update: UpdateInfo }) {
  const [hidden, setHidden] = useState(true);
  const [copied, setCopied] = useState(false);

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

  async function copy() {
    await navigator.clipboard.writeText(COMMAND).catch(() => undefined);
    setCopied(true);
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
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-muted">
        <span>To update, run this where your docker-compose.yml lives:</span>
        <code className="font-mono rounded-sm bg-paper-alt px-2 py-1 text-xs text-ink">{COMMAND}</code>
        <Button variant="quiet" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
