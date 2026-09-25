"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { NameField, UpdateCheckField } from "../OwnerFields";
import { Button, Notice, type NoticeMessage } from "../ui";

export function ProfileForm(props: { name: string; updateCheck: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(props.name);
  const [updateCheck, setUpdateCheck] = useState(props.updateCheck);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<NoticeMessage | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await apiRequest("/api/owner", "Your profile couldn't be saved. Try again.", {
      method: "PATCH",
      body: { name, updateCheck },
    });
    setPending(false);
    setMessage(res.ok ? { tone: "success", text: "Saved." } : { tone: "problem", text: res.error });
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-6">
      <NameField value={name} onChange={setName} />
      <UpdateCheckField checked={updateCheck} onChange={setUpdateCheck} />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
