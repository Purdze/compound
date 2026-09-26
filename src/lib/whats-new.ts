import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseChangelog, type Release } from "@/lib/changelog-parse";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { DEV_VERSION } from "@/lib/version";

let releases: Release[] | undefined;

/** The changelog bundled with this build (see outputFileTracingIncludes in next.config.ts). */
export function readChangelog(): Release[] {
  if (!releases) {
    try {
      releases = parseChangelog(readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8"));
    } catch {
      console.warn("[whats-new] CHANGELOG.md is missing from this build");
      releases = [];
    }
  }
  return releases;
}

/** The running version, if the owner hasn't seen its "What's new" yet. */
export function unseenUpdate(lastSeenVersion: string | null, current = env().APP_VERSION): string | null {
  return current !== DEV_VERSION && current !== lastSeenVersion ? current : null;
}

export async function markSeen(userId: string): Promise<void> {
  await db.user.updateMany({ where: { id: userId }, data: { lastSeenVersion: env().APP_VERSION } });
}
