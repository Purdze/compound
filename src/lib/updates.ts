import "server-only";
import { TtlCache } from "@/lib/cache";
import { env } from "@/lib/env";
import { isNewer } from "@/lib/semver";
import { DEV_VERSION, versionTag } from "@/lib/version";

const REPO = "Purdze/compound";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

export function releaseNotesUrl(version: string): string {
  return `https://github.com/${REPO}/releases/tag/${versionTag(version)}`;
}

type Release = { version: string; url: string };
export type UpdateInfo = Release & { current: string };

const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;
const cache = new TtlCache<Release | null>(CHECK_EVERY_MS);

async function fetchLatest(): Promise<Release | null> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "compound-update-check" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { tag_name?: unknown };
    if (typeof body.tag_name !== "string") return null;
    const version = body.tag_name.replace(/^v/, "");
    return { version, url: releaseNotesUrl(version) };
  } catch {
    return null;
  }
}

/**
 * Returns the cached result without waiting; a stale or missing cache is refreshed
 * in the background so a slow GitHub never delays a page load.
 */
export function availableUpdate(updateCheck: boolean, current = env().APP_VERSION): UpdateInfo | null {
  if (!updateCheck || current === DEV_VERSION) return null;

  const latest = cache.peek("latest");
  if (latest === undefined) void cache.get("latest", fetchLatest);
  return latest && isNewer(latest.version, current) ? { ...latest, current } : null;
}
