import { describe, expect, it } from "vitest";
import { applyPatches } from "../../src/lib/applyPatches.js";

describe("applyPatches", () => {
  it("exposes a function placeholder", () => {
    expect(typeof applyPatches).toBe("function");
  });
});
