"use client";

import { useState } from "react";
import { NameField, NewPasswordFields, UpdateCheckField, newPasswordProblem } from "@/components/OwnerFields";
import { Button, Notice } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";

export function SetupForm() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [updateCheck, setUpdateCheck] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    const problem = newPasswordProblem(password, confirm);
    if (problem) return setError(problem);

    setPending(true);
    setError(null);
    const res = await apiRequest("/api/setup", "Setup didn't complete. Check Compound is running and try again.", {
      method: "POST",
      body: { name, password, updateCheck },
    });
    if (res.ok) {
      window.location.assign("/connect");
      return;
    }
    setPending(false);
    setError(res.error);
  }

  return (
    <form onSubmit={finish} className="mt-8 space-y-6">
      {error && <Notice tone="problem">{error}</Notice>}
      <NameField value={name} onChange={setName} hint="Used to greet you. It never leaves this server." autoFocus />
      <NewPasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
      <UpdateCheckField checked={updateCheck} onChange={setUpdateCheck} />
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? "Setting up…" : "Finish setup"}
      </Button>
    </form>
  );
}
