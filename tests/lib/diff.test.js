import { describe, expect, it } from "vitest";
import { diff } from "../../src/lib/diff.js";

describe("diff", () => {
  it("exposes a function placeholder", () => {
    expect(typeof diff).toBe("function");
  });
});
