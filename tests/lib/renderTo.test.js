import { describe, expect, it } from "vitest";
import { renderTo } from "../../src/lib/renderTo.js";

describe("renderTo", () => {
  it("exposes a function placeholder", () => {
    expect(typeof renderTo).toBe("function");
  });
});
