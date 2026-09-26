"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { ERASED_DATA } from "@/lib/erase";
import { Button, Field, Notice, inputClass, type NoticeMessage } from "../ui";

const CONFIRM = "erase";

export function EraseData() {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<NoticeMessage | null>(null);
  const confirmed = typed.trim().toLowerCase() === CONFIRM;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await apiRequest("/api/account", "Your data couldn't be erased. Try again.", {
      method: "DELETE",
      body: { confirm: CONFIRM },
    });
    setPending(false);
    if (!res.ok) return setMessage({ tone: "problem", text: res.error });
    setTyped("");
    setMessage({ tone: "success", text: `Erased. Your ${ERASED_DATA} are gone.` });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <Field label={`Type ${CONFIRM} to confirm`}>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass} />
      </Field>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" variant="danger" disabled={!confirmed || pending}>
        {pending ? "Erasing…" : "Erase all data"}
      </Button>
    </form>
  );
}
