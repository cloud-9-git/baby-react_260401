import { describe, expect, it } from "vitest";
import { createHistory } from "../src/history.js";

describe("history", () => {
  it("exposes a function placeholder", () => {
    expect(typeof createHistory).toBe("function");
  });
});
