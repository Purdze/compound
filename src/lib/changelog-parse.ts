// Parses CHANGELOG.md into data React can render directly. It covers only the markdown
// the changelog uses (paragraphs, "- " lists, bold, inline code, links), and never
// produces HTML.

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type Block = { kind: "paragraph"; parts: Inline[] } | { kind: "list"; items: Inline[][] };

export type Release = { version: string | null; date: string | null; blocks: Block[] };

const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  const push = (part: Inline) => {
    const prev = parts.at(-1);
    if (part.kind === "text" && prev?.kind === "text") prev.text += part.text;
    else parts.push(part);
  };

  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) push({ kind: "text", text: text.slice(last, m.index) });
    const [whole, bold, code, linkText, href] = m;
    if (bold !== undefined) push({ kind: "bold", text: bold });
    else if (code !== undefined) push({ kind: "code", text: code });
    else if (linkText !== undefined && href !== undefined && /^https?:\/\//.test(href))
      push({ kind: "link", text: linkText, href });
    else push({ kind: "text", text: linkText ?? whole });
    last = m.index + whole.length;
  }
  if (last < text.length) push({ kind: "text", text: text.slice(last) });
  return parts;
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", parts: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };

  for (const line of lines) {
    const item = /^[-*] (.*)$/.exec(line.trim());
    if (item) {
      flush();
      const last = blocks.at(-1);
      const parts = parseInline(item[1]!);
      if (last?.kind === "list") last.items.push(parts);
      else blocks.push({ kind: "list", items: [parts] });
    } else if (line.trim() === "") {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** One entry per `## ` heading, in file order. Sections with nothing in them are left out. */
export function parseChangelog(markdown: string): Release[] {
  const sections = markdown.split(/^## /m).slice(1);
  return sections.flatMap((section) => {
    const [heading = "", ...body] = section.split(/\r?\n/);
    const blocks = parseBlocks(body);
    if (blocks.length === 0) return [];
    const m = /^v?(\d+\.\d+\.\d+)\s*(?:\((\d{4}-\d{2}-\d{2})\))?/.exec(heading.trim());
    return [{ version: m?.[1] ?? null, date: m?.[2] ?? null, blocks }];
  });
}
