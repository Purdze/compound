import { afterEach, expect, mock, test } from "bun:test";

const realFetch = globalThis.fetch;
const CURRENT = "1.3.0";

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
  await new Promise((r) => setTimeout(r, 0));
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
  await new Promise((r) => setTimeout(r, 0));
  expect(availableUpdate(true, CURRENT)).toBeNull();
});

test("makes no request when the update check is off", async () => {
  const fetchMock = release("v9.9.9");
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const { availableUpdate } = await freshModule();
  expect(availableUpdate(false, CURRENT)).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
