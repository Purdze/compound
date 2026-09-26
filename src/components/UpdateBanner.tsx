"use client";

import { useEffect, useState } from "react";
import type { UpdateInfo } from "@/lib/updates";
import { Button } from "./ui";
import { UpdateDetails } from "./UpdateDetails";

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
      <UpdateDetails update={update}>
        <Button variant="quiet" onClick={dismiss}>
          Dismiss
        </Button>
      </UpdateDetails>
    </div>
  );
}
