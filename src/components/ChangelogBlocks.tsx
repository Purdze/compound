import type { Block, Inline } from "@/lib/changelog-parse";
import { ExternalLink } from "./ui";

function Parts({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) => {
    switch (p.kind) {
      case "bold":
        return <strong key={i}>{p.text}</strong>;
      case "code":
        return (
          <code key={i} className="font-mono rounded-sm bg-paper-alt px-1 text-[0.9em]">
            {p.text}
          </code>
        );
      case "link":
        return (
          <ExternalLink key={i} href={p.href}>
            {p.text}
          </ExternalLink>
        );
      default:
        return p.text;
    }
  });
}

export function ChangelogBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="max-w-2xl space-y-4">
      {blocks.map((b, i) =>
        b.kind === "paragraph" ? (
          <p key={i}>
            <Parts parts={b.parts} />
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-2 pl-5 marker:text-ink-muted">
            {b.items.map((item, j) => (
              <li key={j}>
                <Parts parts={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
