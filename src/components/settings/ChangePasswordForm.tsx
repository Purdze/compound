"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { NewPasswordFields, newPasswordProblem } from "../OwnerFields";
import { Button, Notice, PasswordField, type NoticeMessage } from "../ui";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<NoticeMessage | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = newPasswordProblem(next, confirm);
    if (problem) return setMessage({ tone: "problem", text: problem });

    setPending(true);
    setMessage(null);
    const res = await apiRequest("/api/owner/password", "Your password couldn't be changed. Try again.", {
      method: "POST",
      body: { current, next },
    });
    setPending(false);
    if (!res.ok) return setMessage({ tone: "problem", text: res.error });
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage({ tone: "success", text: "Password changed. Your other browsers have been signed out." });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-6">
      <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={setCurrent} />
      <NewPasswordFields
        password={next}
        confirm={confirm}
        onPassword={setNext}
        onConfirm={setConfirm}
        label="New password"
      />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" disabled={pending || !current}>
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
