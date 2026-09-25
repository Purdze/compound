import type { ReactNode } from "react";

export function AuthShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <p className="font-serif text-xl">Compound</p>
      <div className="mt-16 max-w-md">
        <h1 className="text-2xl">{title}</h1>
        <p className="mt-3 text-ink-muted">{intro}</p>
        {children}
      </div>
    </main>
  );
}
