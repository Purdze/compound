"use client";

import { apiRequest } from "@/lib/client-api";
import { Button } from "./ui";

export function SignOutButton({ variant = "quiet" }: { variant?: "quiet" | "secondary" }) {
  async function signOut() {
    await apiRequest("/api/session", "Couldn't sign out.", { method: "DELETE" });
    window.location.assign("/login");
  }
  return (
    <Button variant={variant} onClick={signOut}>
      Sign out
    </Button>
  );
}
