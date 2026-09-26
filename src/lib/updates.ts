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
export type UpdateCheck = { status: "update"; update: UpdateInfo } | { status: "latest" } | { status: "failed" };

const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;
const cache = new TtlCache<Release>(CHECK_EVERY_MS);
let lastFailureAt = 0;

/** Throws when GitHub can't answer; TtlCache doesn't keep failures, so the next check retries. */
async function fetchLatest(): Promise<Release> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "compound-update-check" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const body = (await res.json()) as { tag_name?: unknown };
    if (typeof body.tag_name !== "string") throw new Error("no tag_name");
    const version = body.tag_name.replace(/^v/, "");
    return { version, url: releaseNotesUrl(version) };
  } catch (err) {
    lastFailureAt = Date.now();
    throw err;
  }
}

const newer = (latest: Release, current: string): UpdateInfo | null =>
  isNewer(latest.version, current) ? { ...latest, current } : null;

/**
 * Returns the cached result without waiting; a stale or missing cache is refreshed
 * in the background so a slow GitHub never delays a page load.
 */
export function availableUpdate(updateCheck: boolean, current = env().APP_VERSION): UpdateInfo | null {
  if (!updateCheck || current === DEV_VERSION) return null;

  const latest = cache.peek("latest");
  if (latest === undefined && Date.now() - lastFailureAt > RETRY_AFTER_FAILURE_MS) {
    void cache.get("latest", fetchLatest).catch(() => undefined);
  }
  return latest ? newer(latest, current) : null;
}

/** Asks GitHub now, whatever the update check setting, and refreshes the answer the banner uses. */
export async function checkForUpdates(current = env().APP_VERSION): Promise<UpdateCheck> {
  cache.delete("latest");
  try {
    const update = newer(await cache.get("latest", fetchLatest), current);
    return update ? { status: "update", update } : { status: "latest" };
  } catch {
    return { status: "failed" };
  }
}
