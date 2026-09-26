import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseChangelog, parseInline } from "../src/lib/changelog-parse";
import { unseenUpdate } from "../src/lib/whats-new";
import { DEV_VERSION } from "../src/lib/version";

describe("parseChangelog", () => {
  test("reads the real changelog: versions, dates, and no empty Unreleased", () => {
    const releases = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));
    expect(releases.length).toBeGreaterThanOrEqual(3);
    expect(releases.every((r) => r.blocks.length > 0)).toBe(true);
    const first = releases.find((r) => r.version === "0.1.0");
    expect(first?.date).toBe("2026-09-25");
  });

  test("keeps an Unreleased section that has entries", () => {
    const [unreleased, released] = parseChangelog(
      "# Changelog\n\n## Unreleased\n\n- Soon\n\n## 1.0.0 (2026-01-02)\n\n- Now\n",
    );
    expect(unreleased).toMatchObject({ version: null, date: null });
    expect(released).toMatchObject({ version: "1.0.0", date: "2026-01-02" });
  });

  test("separates paragraphs from lists and joins wrapped lines", () => {
    const [release] = parseChangelog("## 1.0.0\n\nFirst line\nsecond line.\n\n- one\n- two\n\nAfter.\n");
    expect(release?.blocks).toEqual([
      { kind: "paragraph", parts: [{ kind: "text", text: "First line second line." }] },
      { kind: "list", items: [[{ kind: "text", text: "one" }], [{ kind: "text", text: "two" }]] },
      { kind: "paragraph", parts: [{ kind: "text", text: "After." }] },
    ]);
  });
});

test("parseInline splits bold, code and links, and only links http(s)", () => {
  expect(parseInline("Run `pull`, see **Settings** or [docs](https://x.test/a).")).toEqual([
    { kind: "text", text: "Run " },
    { kind: "code", text: "pull" },
    { kind: "text", text: ", see " },
    { kind: "bold", text: "Settings" },
    { kind: "text", text: " or " },
    { kind: "link", text: "docs", href: "https://x.test/a" },
    { kind: "text", text: "." },
  ]);
  expect(parseInline("[click](javascript:alert(1))")).toEqual([{ kind: "text", text: "click)" }]);
  expect(parseInline("[readme](README.md)")).toEqual([{ kind: "text", text: "readme" }]);
});

test("unseenUpdate announces a version once, and never on dev builds", () => {
  expect(unseenUpdate(null, "0.3.0")).toBe("0.3.0");
  expect(unseenUpdate("0.2.1", "0.3.0")).toBe("0.3.0");
  expect(unseenUpdate("0.3.0", "0.3.0")).toBeNull();
  expect(unseenUpdate(null, DEV_VERSION)).toBeNull();
});
