import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { sessionState } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { status } = await sessionState();
  if (status === "needs-setup") redirect("/setup");
  if (status === "signed-in") redirect("/");
  return (
    <AuthShell title="Sign in" intro="Enter the password you chose when you set up Compound.">
      <LoginForm />
    </AuthShell>
  );
}
