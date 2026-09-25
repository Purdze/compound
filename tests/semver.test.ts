import { expect, test } from "bun:test";
import { isNewer } from "../src/lib/semver";

test("isNewer compares major, minor and patch numerically", () => {
  expect(isNewer("1.4.0", "1.3.9")).toBe(true);
  expect(isNewer("v1.10.0", "1.9.0")).toBe(true);
  expect(isNewer("2.0.0", "1.99.99")).toBe(true);
  expect(isNewer("1.3.0", "1.3.0")).toBe(false);
  expect(isNewer("1.2.9", "1.3.0")).toBe(false);
  expect(isNewer("1.4.0-beta", "1.3.0")).toBe(false);
  expect(isNewer("1.4.0", "dev")).toBe(false);
});
