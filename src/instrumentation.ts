// Runs once when the server starts: fail fast on bad configuration or an unwritable
// data volume instead of on the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env");
    const { secrets } = await import("@/lib/secrets");
    env();
    secrets();
  }
}
