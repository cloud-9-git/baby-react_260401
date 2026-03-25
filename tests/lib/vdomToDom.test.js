import { describe, expect, it } from "vitest";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("vdomToDom", () => {
  it("exposes a function placeholder", () => {
    expect(typeof vdomToDom).toBe("function");
  });
});
