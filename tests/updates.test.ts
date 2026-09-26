import { afterEach, expect, mock, test } from "bun:test";

const realFetch = globalThis.fetch;
const CURRENT = "1.3.0";
const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function freshModule() {
  // Each test needs its own release cache, which is module state.
  return import(`../src/lib/updates?${Math.random()}`) as Promise<typeof import("../src/lib/updates")>;
}

const release = (tag: string) =>
  mock(async () =>
    Response.json({ tag_name: tag, html_url: `https://github.com/Purdze/compound/releases/tag/${tag}` }),
  );

test("reports a newer release after the background check completes", async () => {
  const fetchMock = release("v1.4.0");
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const { availableUpdate } = await freshModule();

  expect(availableUpdate(true, CURRENT)).toBeNull();
  await tick();
  expect(availableUpdate(true, CURRENT)).toEqual({
    version: "1.4.0",
    current: "1.3.0",
    url: "https://github.com/Purdze/compound/releases/tag/v1.4.0",
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("stays quiet when already up to date", async () => {
  globalThis.fetch = release("v1.3.0") as unknown as typeof fetch;
  const { availableUpdate } = await freshModule();
  availableUpdate(true, CURRENT);
  await tick();
  expect(availableUpdate(true, CURRENT)).toBeNull();
});

test("makes no request when the update check is off", async () => {
  const fetchMock = release("v9.9.9");
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const { availableUpdate } = await freshModule();
  expect(availableUpdate(false, CURRENT)).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("checkForUpdates asks again and refreshes what the banner shows", async () => {
  globalThis.fetch = release("v1.3.0") as unknown as typeof fetch;
  const { availableUpdate, checkForUpdates } = await freshModule();
  expect(await checkForUpdates(CURRENT)).toEqual({ status: "latest" });

  const fetchMock = release("v1.4.0");
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  expect(await checkForUpdates(CURRENT)).toEqual({
    status: "update",
    update: { version: "1.4.0", current: "1.3.0", url: "https://github.com/Purdze/compound/releases/tag/v1.4.0" },
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(availableUpdate(true, CURRENT)?.version).toBe("1.4.0");
});

test("checkForUpdates reports a failed check", async () => {
  const { checkForUpdates } = await freshModule();
  globalThis.fetch = mock(async () => new Response("", { status: 403 })) as unknown as typeof fetch;
  expect(await checkForUpdates(CURRENT)).toEqual({ status: "failed" });
  globalThis.fetch = mock(async () => {
    throw new Error("offline");
  }) as unknown as typeof fetch;
  expect(await checkForUpdates(CURRENT)).toEqual({ status: "failed" });
});

test("a failed background check is retried after five minutes, not twelve hours", async () => {
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    const failing = mock(async () => new Response("", { status: 500 }));
    globalThis.fetch = failing as unknown as typeof fetch;
    const { availableUpdate } = await freshModule();

    availableUpdate(true, CURRENT);
    await tick();
    availableUpdate(true, CURRENT);
    expect(failing).toHaveBeenCalledTimes(1);

    const recovered = release("v1.4.0");
    globalThis.fetch = recovered as unknown as typeof fetch;
    now += 5 * 60 * 1000 + 1;
    availableUpdate(true, CURRENT);
    await tick();
    expect(recovered).toHaveBeenCalledTimes(1);
    expect(availableUpdate(true, CURRENT)?.version).toBe("1.4.0");
  } finally {
    Date.now = realNow;
  }
});
