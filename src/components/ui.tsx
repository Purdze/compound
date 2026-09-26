import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "quiet";

export const API_KEY_SETTINGS = "/settings#api-key";
export const WHATS_NEW = "/whats-new";
export const T212_APP_URL = "https://app.trading212.com/";

export const linkClass =
  "text-ink-muted underline underline-offset-4 decoration-rule hover:text-ink hover:decoration-ink-muted";

const variants: Record<Variant, string> = {
  primary: "rounded-sm px-4 py-2 bg-accent text-paper hover:bg-ink",
  secondary: "rounded-sm px-4 py-2 border border-rule bg-paper text-ink hover:border-ink-muted",
  danger: "rounded-sm px-4 py-2 border border-accent-rust text-accent-rust hover:bg-accent-rust hover:text-paper",
  quiet: linkClass,
};

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

/** Also used to style links that act as buttons. */
export function buttonClass(variant: Variant = "primary") {
  return `inline-block text-sm font-medium disabled:opacity-50 ${variants[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-rule py-10">
      <div className="grid gap-6 md:grid-cols-[16rem_1fr] md:gap-12">
        <div>
          <h2 className="text-lg">{title}</h2>
          {description && <div className="mt-2 text-sm text-ink-muted">{description}</div>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

type NoticeTone = "info" | "problem" | "success";
export type NoticeMessage = { tone: NoticeTone; text: string };

export function Notice({ tone = "info", children }: { tone?: NoticeTone; children: ReactNode }) {
  const bar = tone === "problem" ? "border-accent-rust" : tone === "success" ? "border-accent" : "border-rule";
  return (
    <div role={tone === "problem" ? "alert" : "status"} className={`border-l-2 ${bar} bg-paper-alt px-4 py-3 text-sm`}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="mt-1 block text-sm text-ink-muted">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export const inputClass =
  "w-full rounded-sm border border-rule bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-muted/70 focus:border-ink-muted";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  autoFocus?: boolean;
};

export function PasswordField({
  autoComplete,
  ...props
}: TextFieldProps & { autoComplete: "current-password" | "new-password" }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <input
        type="password"
        required
        autoComplete={autoComplete}
        autoFocus={props.autoFocus}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

export function Table({ minWidth, children }: { minWidth: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function HeadRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-rule text-left text-ink-muted">{children}</tr>;
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-rule">{children}</tr>;
}

type CellProps = { align?: "left" | "right"; className?: string; children: ReactNode };

const cellClass = ({ align = "left", className = "" }: Omit<CellProps, "children">) =>
  `py-3 pr-4 last:pr-0 ${align === "right" ? "text-right" : ""} ${className}`;

export function Th({ children, ...rest }: CellProps) {
  return <th className={`${cellClass(rest)} font-medium`}>{children}</th>;
}

export function Td({ children, ...rest }: CellProps) {
  return <td className={cellClass(rest)}>{children}</td>;
}

export const lossClass = (value: number) => (value < 0 ? "text-accent-rust" : "");

export function Stat({
  label,
  value,
  note,
  className = "",
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className="md:px-8 md:first:pl-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={`figure mt-1 text-xl ${className}`}>{value}</dd>
      {note && <dd className="mt-1 text-sm text-ink-muted">{note}</dd>}
    </div>
  );
}
