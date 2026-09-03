import { afterEach, describe, expect, it, vi } from "vitest";
import { withStartupTimeout } from "./startup";

afterEach(() => vi.useRealTimers());

describe("startup timeout", () => {
  it("returns a completed startup task", async () => {
    await expect(withStartupTimeout(Promise.resolve("ready"), 10)).resolves.toBe("ready");
  });

  it("reports browsers whose storage never responds", async () => {
    vi.useFakeTimers();
    const result = expect(withStartupTimeout(new Promise(() => undefined), 10))
      .rejects.toThrow("請改用 Chrome 或 Safari");
    await vi.advanceTimersByTimeAsync(10);
    await result;
  });
});
