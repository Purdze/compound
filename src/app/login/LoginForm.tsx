"use client";

import { useState } from "react";
import { Button, Notice, PasswordField } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await apiRequest("/api/session", "Couldn't sign in. Check Compound is running and try again.", {
      method: "POST",
      body: { password },
    });
    if (res.ok) {
      window.location.assign("/");
      return;
    }
    setError(res.error);
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      {error && <Notice tone="problem">{error}</Notice>}
      <PasswordField
        label="Password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" disabled={pending || !password}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
