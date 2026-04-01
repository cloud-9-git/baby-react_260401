// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { applyPatches, diff } from "../../src/lib.js";
import { elementNode, textNode } from "../../src/constants.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("runtime DOM integration", () => {
  it("camelCase 이벤트 prop을 mount/update/remove 과정에서 올바르게 반영한다", () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const oldVdom = elementNode("button", { onClick: firstHandler }, [textNode("Tap")]);
    const nextVdom = elementNode("button", { onClick: secondHandler }, [textNode("Tap")]);
    const finalVdom = elementNode("button", {}, [textNode("Tap")]);
    const button = vdomToDom(oldVdom);

    button.click();
    expect(firstHandler).toHaveBeenCalledTimes(1);

    applyPatches(button, diff(oldVdom, nextVdom));
    button.click();

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(1);

    applyPatches(button, diff(nextVdom, finalVdom));
    button.click();

    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it("event prop 변경은 다른 속성과 함께 patch로 안전하게 반영된다", () => {
    const submitHandler = vi.fn((event) => event.preventDefault());
    const oldVdom = elementNode("form", { title: "before" }, [
      elementNode("button", { type: "submit" }, [textNode("Go")]),
    ]);
    const nextVdom = elementNode("form", { title: "after", onSubmit: submitHandler }, [
      elementNode("button", { type: "submit" }, [textNode("Go")]),
    ]);
    const form = vdomToDom(oldVdom);
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });

    applyPatches(form, diff(oldVdom, nextVdom));
    form.dispatchEvent(submitEvent);

    expect(form.getAttribute("title")).toBe("after");
    expect(submitHandler).toHaveBeenCalledTimes(1);
    expect(submitEvent.defaultPrevented).toBe(true);
  });
});
