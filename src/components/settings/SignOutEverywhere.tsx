"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { Button, Notice, type NoticeMessage } from "../ui";

export function SignOutEverywhere() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<NoticeMessage | null>(null);

  async function signOutEverywhere() {
    setPending(true);
    setMessage(null);
    const res = await apiRequest("/api/session/everywhere", "Couldn't sign out other browsers. Try again.", {
      method: "POST",
    });
    setPending(false);
    setMessage(
      res.ok
        ? { tone: "success", text: "Every other browser and device is signed out. This one stays signed in." }
        : { tone: "problem", text: res.error },
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={signOutEverywhere} disabled={pending}>
        {pending ? "Signing out…" : "Sign out everywhere else"}
      </Button>
      <p className="text-sm text-ink-muted">Use this if you signed in on a device you no longer use or trust.</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}
