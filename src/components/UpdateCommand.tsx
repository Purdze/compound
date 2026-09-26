"use client";

import { useState } from "react";
import { Button } from "./ui";

const COMMAND = "docker compose pull && docker compose up -d";

export function UpdateCommand() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(COMMAND).catch(() => undefined);
    setCopied(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-muted">
      <span>To update, run this where your docker-compose.yml lives:</span>
      <code className="font-mono rounded-sm bg-paper-alt px-2 py-1 text-xs text-ink">{COMMAND}</code>
      <Button variant="quiet" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
