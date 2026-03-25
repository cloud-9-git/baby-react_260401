import { describe, expect, it } from "vitest";
import { domToVdom } from "../../src/lib/domToVdom.js";

describe("domToVdom", () => {
  it("exposes a function placeholder", () => {
    expect(typeof domToVdom).toBe("function");
  });
});
