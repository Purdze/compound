const SNAPSHOT_EVERY_MS = 6 * 60 * 60_000;
const FIRST_SNAPSHOT_AFTER_MS = 60_000;

// Runs once when the server starts: fail fast on bad configuration or an unwritable
// data volume instead of on the first request, then keep a daily record of the
// portfolio's value even on days nobody opens Compound.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env");
    const { secrets } = await import("@/lib/secrets");
    env();
    secrets();

    const { OWNER_ID } = await import("@/lib/setup");
    const { getPortfolio } = await import("@/lib/t212/portfolio");
    const record = () => void getPortfolio(OWNER_ID);
    setTimeout(record, FIRST_SNAPSHOT_AFTER_MS);
    setInterval(record, SNAPSHOT_EVERY_MS);
  }
}
