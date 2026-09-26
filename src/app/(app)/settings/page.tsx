import Link from "next/link";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { EraseData } from "@/components/settings/EraseData";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SignOutEverywhere } from "@/components/settings/SignOutEverywhere";
import { UpdateCheck } from "@/components/settings/UpdateCheck";
import { LocalTime } from "@/components/LocalTime";
import { SignOutButton } from "@/components/SignOutButton";
import { HeadRow, Row, Section, Table, Td, Th, WHATS_NEW, linkClass } from "@/components/ui";
import { apiKeyStatus } from "@/lib/api-key-status";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { ERASED_DATA } from "@/lib/erase";
import { env } from "@/lib/env";
import { failureForStatus } from "@/lib/t212/client";
import { DEV_VERSION, versionTag } from "@/lib/version";

export const dynamic = "force-dynamic";

const USAGE_SHOWN = 10;

const FAILURE_LABELS = { BAD_KEY: "Key rejected", RATE_LIMITED: "Rate limited", UNAVAILABLE: "Failed" } as const;

function resultLabel(status: number): string {
  if (status === 0) return "No response";
  const failure = failureForStatus(status);
  return failure ? FAILURE_LABELS[failure] : "Success";
}

export default async function SettingsPage() {
  const owner = await requireOwner();
  const version = env().APP_VERSION;
  const [key, usage] = await Promise.all([
    apiKeyStatus(owner.id),
    db.apiKeyUsageLog.findMany({
      where: { userId: owner.id },
      orderBy: { createdAt: "desc" },
      take: USAGE_SHOWN,
      select: { id: true, endpoint: true, status: true, createdAt: true },
    }),
  ]);

  return (
    <div className="pt-12">
      <h1 className="text-2xl">Settings</h1>
      <div className="mt-10">
        <div id="api-key" className="scroll-mt-8">
          <Section
            title="Trading 212 API key"
            description="Compound reads your portfolio with a key you create in Trading 212. It's encrypted before it's stored and never sent back to your browser."
          >
            <ApiKeyForm status={key} />
          </Section>
        </div>

        <Section
          title="Key activity"
          description={`The last ${USAGE_SHOWN} calls Compound made to Trading 212 with your key.`}
        >
          {usage.length === 0 ? (
            <p className="text-sm text-ink-muted">No calls yet. They&apos;ll appear here once your portfolio loads.</p>
          ) : (
            <div className="max-w-xl">
              <Table minWidth="24rem">
                <thead>
                  <HeadRow>
                    <Th>When</Th>
                    <Th>Endpoint</Th>
                    <Th align="right">Result</Th>
                  </HeadRow>
                </thead>
                <tbody>
                  {usage.map((u) => (
                    <Row key={u.id}>
                      <Td>
                        <LocalTime iso={u.createdAt.toISOString()} withDate />
                      </Td>
                      <Td className="font-mono text-xs">{u.endpoint}</Td>
                      <Td align="right" className={failureForStatus(u.status) ? "text-accent-rust" : ""}>
                        <span title={u.status ? `HTTP ${u.status}` : undefined}>{resultLabel(u.status)}</span>
                      </Td>
                    </Row>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Section>

        <Section title="Profile">
          <ProfileForm name={owner.name ?? ""} updateCheck={owner.updateCheck} />
        </Section>

        <Section
          title="Password"
          description="Changing it signs out your other browsers. Forgotten it? See the README for the reset command."
        >
          <div className="space-y-8">
            <ChangePasswordForm />
            <div className="space-y-6 border-t border-rule pt-6">
              <SignOutButton variant="secondary" />
              <SignOutEverywhere />
            </div>
          </div>
        </Section>

        <Section
          title="Erase all data"
          description={`Removes your stored ${ERASED_DATA} from this Compound install. This can't be undone.`}
        >
          <EraseData />
        </Section>
      </div>
      <div className="border-t border-rule pt-6 text-sm text-ink-muted">
        {version === DEV_VERSION ? (
          "Compound development build"
        ) : (
          <>
            Compound {versionTag(version)} ·{" "}
            <Link href={WHATS_NEW} className={linkClass}>
              What&apos;s new
            </Link>{" "}
            · <UpdateCheck />
          </>
        )}
      </div>
    </div>
  );
}
