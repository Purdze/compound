import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SignOutButton } from "@/components/SignOutButton";
import { UpdateBanner } from "@/components/UpdateBanner";
import { UpdatedNotice } from "@/components/UpdatedNotice";
import { VuagTicker } from "@/components/VuagTicker";
import { requireOwner } from "@/lib/auth";
import { availableUpdate } from "@/lib/updates";
import { unseenUpdate } from "@/lib/whats-new";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  const update = availableUpdate(owner.updateCheck);
  const updatedTo = unseenUpdate(owner.lastSeenVersion);

  return (
    <div className="mx-auto max-w-6xl px-6">
      <header className="flex flex-wrap items-center justify-between gap-x-10 gap-y-3 border-b border-rule py-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          <Link href="/" className="font-serif text-xl font-semibold">
            Compound
          </Link>
          <Nav />
        </div>
        <div className="flex items-center gap-6">
          <VuagTicker />
          <SignOutButton />
        </div>
      </header>
      {updatedTo && <UpdatedNotice version={updatedTo} />}
      {update && <UpdateBanner update={update} />}
      <main className="pb-24">{children}</main>
    </div>
  );
}
