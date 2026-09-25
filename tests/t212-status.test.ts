import { expect, test } from "bun:test";
import { failureForStatus } from "../src/lib/t212/client";

test("failureForStatus classifies Trading 212 responses", () => {
  expect(failureForStatus(200)).toBeNull();
  expect(failureForStatus(204)).toBeNull();
  expect(failureForStatus(401)).toBe("BAD_KEY");
  expect(failureForStatus(403)).toBe("BAD_KEY");
  expect(failureForStatus(429)).toBe("RATE_LIMITED");
  expect(failureForStatus(500)).toBe("UNAVAILABLE");
  expect(failureForStatus(0)).toBe("UNAVAILABLE");
});
