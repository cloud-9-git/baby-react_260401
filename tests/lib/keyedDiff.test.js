import { describe, expect, it } from "vitest";
import { PatchType, elementNode, textNode } from "../../src/constants.js";
import { diff } from "../../src/lib/diff.js";

describe("keyed diff", () => {
  it("vnode에 key가 보존된다", () => {
    const vnode = elementNode("div", { id: "x" }, [textNode("a")], "k1");
    expect(vnode.key).toBe("k1");
  });

  it("같은 인덱스에서 key가 다르면 REMOVE + ADD로 처리한다 (MOVE 없음)", () => {
    const oldVdom = elementNode("div", {}, [
      elementNode("span", { id: "a" }, [textNode("A")], "x"),
    ]);
    const newVdom = elementNode("div", {}, [
      elementNode("span", { id: "b" }, [textNode("B")], "y"),
    ]);

    const patches = diff(oldVdom, newVdom);

    expect(patches).toEqual([
      {
        type: PatchType.ADD,
        path: [0],
        node: elementNode("span", { id: "b" }, [textNode("B")], "y"),
      },
      {
        type: PatchType.REMOVE,
        path: [0],
      },
    ]);
  });

  it("key가 같고 내용만 바뀌면 최소 패치(TEXT)만 만든다", () => {
    const oldVdom = elementNode("ul", {}, [
      elementNode("li", {}, [textNode("A")], "k-a"),
    ]);
    const newVdom = elementNode("ul", {}, [
      elementNode("li", {}, [textNode("A!")], "k-a"),
    ]);

    const patches = diff(oldVdom, newVdom);

    expect(patches).toEqual([
      {
        type: PatchType.TEXT,
        path: [0, 0],
        value: "A!",
      },
    ]);
  });

  it("key가 있는 리스트에서 중간 삽입은 REMOVE + ADD 조합으로 처리한다 (MOVE 없음)", () => {
    const oldVdom = elementNode("ul", {}, [
      elementNode("li", {}, [textNode("A")], "a"),
      elementNode("li", {}, [textNode("B")], "b"),
    ]);
    const newVdom = elementNode("ul", {}, [
      elementNode("li", {}, [textNode("A")], "a"),
      elementNode("li", {}, [textNode("X")], "x"),
      elementNode("li", {}, [textNode("B")], "b"),
    ]);

    const patches = diff(oldVdom, newVdom);

    expect(patches).toEqual([
      {
        type: PatchType.ADD,
        path: [1],
        node: elementNode("li", {}, [textNode("X")], "x"),
      },
      {
        type: PatchType.REMOVE,
        path: [1],
      },
      {
        type: PatchType.ADD,
        path: [2],
        node: elementNode("li", {}, [textNode("B")], "b"),
      },
    ]);
  });
});
