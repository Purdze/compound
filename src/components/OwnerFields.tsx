"use client";

import { MIN_PASSWORD_LENGTH, NAME_MAX_LENGTH } from "@/lib/field-rules";
import { Field, PasswordField, inputClass } from "./ui";

export function newPasswordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

type NewPasswordProps = {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  label?: string;
};

export function NewPasswordFields({ password, confirm, onPassword, onConfirm, label = "Password" }: NewPasswordProps) {
  return (
    <>
      <PasswordField
        label={label}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        autoComplete="new-password"
        value={password}
        onChange={onPassword}
      />
      <PasswordField
        label={`Confirm ${label.toLowerCase()}`}
        autoComplete="new-password"
        value={confirm}
        onChange={onConfirm}
      />
    </>
  );
}

export function NameField(props: { value: string; onChange: (v: string) => void; hint?: string; autoFocus?: boolean }) {
  return (
    <Field label="Your name" hint={props.hint}>
      <input
        required
        autoFocus={props.autoFocus}
        maxLength={NAME_MAX_LENGTH}
        autoComplete="given-name"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

export function UpdateCheckField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-accent"
      />
      <span>
        <span className="block font-medium">Tell me when a new version is out</span>
        <span className="block text-ink-muted">
          Checks GitHub twice a day for the latest version number. Nothing about you or your portfolio is sent.
        </span>
      </span>
    </label>
  );
}
