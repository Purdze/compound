"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiKeyStatus } from "@/lib/api-key-status";
import { apiRequest } from "@/lib/client-api";
import { LocalTime } from "../LocalTime";
import { Button, ExternalLink, Field, Notice, inputClass, type NoticeMessage } from "../ui";

// Names exactly as Trading 212 shows them, and in its order within each group, so they can be
// matched line by line. Descriptions come from the scope each Trading 212 API endpoint requires.
const PERMISSION_GROUPS = [
  {
    title: "Turn on",
    note: "All Compound needs to show your portfolio.",
    items: [
      ["Account data", "Your cash balance and account details."],
      ["Portfolio", "Your open positions and what they're worth."],
    ],
  },
  {
    title: "Optional",
    note: "Read-only and safe to turn on. Compound doesn't show this data yet, but future versions will use it if it's available.",
    items: [
      ["History", "Exports your account history as CSV reports."],
      ["History - Dividends", "Dividends you've been paid."],
      ["History - Orders", "Orders you've placed in the past."],
      ["History - Transactions", "Deposits, withdrawals and other cash movements."],
      ["Metadata", "The instruments and exchanges Trading 212 offers."],
      ["Orders - Read", "Orders waiting to be filled."],
      ["Pies - Read", "Your pies and their settings."],
    ],
  },
  {
    title: "Must stay off",
    note: "These can move your money.",
    items: [
      ["Orders - Execute", "Places buy and sell orders, and cancels them."],
      ["Pies - Write", "Creates, changes and deletes pies."],
    ],
  },
] as const;

export function ApiKeyForm({ status }: { status: ApiKeyStatus }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState<NoticeMessage | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await apiRequest<{ warning: string | null }>("/api/keys", "The key couldn't be saved. Try again.", {
      method: "POST",
      body: { key, secret },
    });
    setSaving(false);
    if (!res.ok) return setMessage({ tone: "problem", text: res.error });
    setKey("");
    setSecret("");
    setReplacing(false);
    setMessage(
      res.data.warning
        ? { tone: "info", text: res.data.warning }
        : { tone: "success", text: "Key saved and connected." },
    );
    router.refresh();
  }

  async function remove() {
    setMessage(null);
    setConfirmRemove(false);
    const res = await apiRequest("/api/keys", "The key couldn't be removed. Try again.", { method: "DELETE" });
    if (!res.ok) return setMessage({ tone: "problem", text: res.error });
    setMessage({ tone: "success", text: "Key removed. Compound no longer has access to your Trading 212 account." });
    router.refresh();
  }

  const showForm = !status.connected || replacing;

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-6 empty:hidden">
        {status.connected && (
          <Notice tone="success">
            <p className="font-medium">Connected</p>
            <p className="mt-1 text-ink-muted">
              Added <LocalTime iso={status.createdAt} withDate />
              {status.lastUsedAt ? (
                <>
                  {" "}
                  · last used <LocalTime iso={status.lastUsedAt} withDate />
                </>
              ) : (
                " · not used yet"
              )}
            </p>
          </Notice>
        )}

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {status.connected && !replacing && (
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="secondary" onClick={() => setReplacing(true)}>
              Replace key
            </Button>
            {confirmRemove ? (
              <span className="flex flex-wrap items-center gap-3 text-sm">
                Remove this key now?
                <Button variant="danger" onClick={remove}>
                  Remove key
                </Button>
                <Button variant="quiet" onClick={() => setConfirmRemove(false)}>
                  Keep it
                </Button>
              </span>
            ) : (
              <Button variant="danger" onClick={() => setConfirmRemove(true)}>
                Remove key
              </Button>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-2">
          <div className="text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-ink-muted">
              <li>
                Sign in at <ExternalLink href="https://app.trading212.com/">app.trading212.com</ExternalLink> and open
                API (Beta). In the mobile app it&apos;s under Settings.
              </li>
              <li>Choose Generate API key and give it a name such as “Compound”.</li>
              <li>Set the permissions as below.</li>
              <li>Copy the API key and the secret. The secret is shown only once.</li>
            </ol>

            <div className="mt-6 divide-y divide-rule border-y border-rule">
              {PERMISSION_GROUPS.map((group) => (
                <details key={group.title} className="group py-3">
                  <summary className="flex list-none items-baseline justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    <span>
                      {group.title} <span className="font-normal text-ink-muted">· {group.items.length}</span>
                    </span>
                    <span className="text-xs font-normal text-ink-muted">
                      <span className="group-open:hidden">Show</span>
                      <span className="hidden group-open:inline">Hide</span>
                    </span>
                  </summary>
                  <p className="mt-1 text-ink-muted">{group.note}</p>
                  <ul className="mt-3 space-y-2">
                    {group.items.map(([name, does]) => (
                      <li key={name}>
                        {name}
                        <span className="block text-xs text-ink-muted">{does}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>

          <form onSubmit={save} className="space-y-5 border-t border-rule pt-6 lg:border-t-0 lg:pt-0">
            <p className="border-l-2 border-accent-rust pl-4 text-sm font-medium">
              Only paste a read-only API key. Never share a key with trading permissions.
            </p>
            <CredentialField label="API key" value={key} onChange={setKey} />
            <CredentialField label="API secret" value={secret} onChange={setSecret} secret />
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving || !key || !secret}>
                {saving ? "Checking key…" : "Save key"}
              </Button>
              {replacing && (
                <Button variant="quiet" type="button" onClick={() => setReplacing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CredentialField(props: { label: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  return (
    <Field label={props.label}>
      <input
        type={props.secret ? "password" : "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required
        autoComplete="off"
        spellCheck={false}
        className={`${inputClass} font-mono text-sm`}
      />
    </Field>
  );
}
