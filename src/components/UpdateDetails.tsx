"use client";

import { useState, type ReactNode } from "react";
import type { UpdateInfo } from "@/lib/updates";
import { versionTag } from "@/lib/version";
import { Button, ExternalLink } from "./ui";

const COMMAND = "docker compose pull && docker compose up -d";

/** What's available and how to update; `children` adds actions after the release link. */
export function UpdateDetails({ update, children }: { update: UpdateInfo; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(COMMAND).catch(() => undefined);
    setCopied(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span>
          Compound {versionTag(update.version)} is available. You&apos;re on {versionTag(update.current)}.
        </span>
        <ExternalLink href={update.url}>What&apos;s new</ExternalLink>
        {children}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-muted">
        <span>To update, run this where your docker-compose.yml lives:</span>
        <code className="font-mono rounded-sm bg-paper-alt px-2 py-1 text-xs text-ink">{COMMAND}</code>
        <Button variant="quiet" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </>
  );
}
