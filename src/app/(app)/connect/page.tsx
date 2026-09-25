import Link from "next/link";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { buttonClass, linkClass } from "@/components/ui";
import { apiKeyStatus } from "@/lib/api-key-status";
import { requireOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const { id } = await requireOwner();
  const status = await apiKeyStatus(id);

  return (
    <div className="pt-12">
      <h1 className="text-2xl">Connect Trading 212</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        Add a read-only key to see your live portfolio. You can do this later in Settings; the goal simulator works
        either way.
      </p>
      <div className="mt-10 border-t border-rule pt-10">
        <ApiKeyForm status={status} />
      </div>
      <p className="mt-10 border-t border-rule pt-6 text-sm">
        {status.connected ? (
          <Link href="/" className={buttonClass()}>
            Go to your dashboard
          </Link>
        ) : (
          <Link href="/" className={linkClass}>
            Skip for now
          </Link>
        )}
      </p>
    </div>
  );
}
