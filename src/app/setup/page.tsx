import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { isSetUp } from "@/lib/setup";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await isSetUp()) redirect("/login");
  return (
    <AuthShell
      title="Set up Compound"
      intro="A couple of details and you're in. Everything here stays on your own server."
    >
      <SetupForm />
    </AuthShell>
  );
}
