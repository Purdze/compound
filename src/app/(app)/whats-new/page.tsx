import { ChangelogBlocks } from "@/components/ChangelogBlocks";
import { requireOwner } from "@/lib/auth";
import { env } from "@/lib/env";
import { dayLabel } from "@/lib/format";
import { DEV_VERSION, versionTag } from "@/lib/version";
import { markSeen, readChangelog } from "@/lib/whats-new";

export const dynamic = "force-dynamic";

const headingNote = "font-sans text-sm font-normal";

export default async function WhatsNewPage() {
  const { id: userId } = await requireOwner();
  await markSeen(userId);
  const current = env().APP_VERSION;
  // Unreleased entries only mean something on a build from source.
  const releases = readChangelog().filter((r) => r.version !== null || current === DEV_VERSION);

  return (
    <div className="pt-12">
      <h1 className="text-2xl">What&apos;s new</h1>
      <p className="mt-3 text-ink-muted">
        {current === DEV_VERSION
          ? "You're running a development build."
          : `You're on ${versionTag(current)}. Here's what changed in each version.`}
      </p>

      {releases.length === 0 ? (
        <p className="mt-10 border-t border-rule pt-10 text-ink-muted">
          This build doesn&apos;t include its changelog. The release notes on GitHub list every change.
        </p>
      ) : (
        releases.map((r) => (
          <section key={r.version ?? "unreleased"} className="mt-10 border-t border-rule pt-10">
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-xl">
              {r.version ? versionTag(r.version) : "Not yet released"}
              {r.date && <span className={`${headingNote} text-ink-muted`}>{dayLabel(r.date)}</span>}
              {r.version === current && <span className={`${headingNote} text-accent`}>Your version</span>}
            </h2>
            <div className="mt-4">
              <ChangelogBlocks blocks={r.blocks} />
            </div>
          </section>
        ))
      )}
    </div>
  );
}
