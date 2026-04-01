import { describe, expect, it } from "vitest";
import { componentNode, elementNode, textNode } from "../../src/constants.js";
import { createElement } from "../../src/lib.js";
import { resolveVNodeTree } from "../../src/runtime/resolveVNodeTree.js";

const h = createElement;

describe("component node / resolveVNodeTree", () => {
  it("함수 type은 COMPONENT_NODE를 만든다", () => {
    function Badge({ label, children }) {
      return h("span", {}, label, children);
    }

    const vnode = h(Badge, { key: "badge-1", label: "wow" }, "!");

    expect(vnode).toEqual(
      componentNode(Badge, { label: "wow", children: [textNode("!")] }, "badge-1"),
    );
  });

  it("component child는 props.children으로만 전달된다", () => {
    function Panel(props) {
      return props.children[0];
    }

    const vnode = h(Panel, {}, h("span", {}, "child"));

    expect(vnode.props.children).toEqual([
      elementNode("span", {}, [textNode("child")], null),
    ]);
    expect(Object.hasOwn(vnode, "children")).toBe(false);
  });

  it("resolveVNodeTree는 중첩 COMPONENT_NODE를 resolved tree로 푼다", () => {
    function Badge({ label }) {
      return h("strong", {}, label);
    }

    function Wrapper({ children }) {
      return h("section", { className: "wrapper" }, children);
    }

    const unresolvedVnode = h(Wrapper, {}, h(Badge, { key: "badge-1", label: "wow" }));
    const resolvedVnode = resolveVNodeTree(unresolvedVnode);

    expect(resolvedVnode).toEqual(
      elementNode("section", { className: "wrapper" }, [
        elementNode("strong", {}, [textNode("wow")], null),
      ], null),
    );
  });

  it("resolve 결과에는 COMPONENT_NODE가 남지 않는다", () => {
    function CounterLabel({ count }) {
      return h("span", {}, String(count));
    }

    function Layout({ children }) {
      return h("div", { className: "layout" }, children);
    }

    const resolvedVnode = resolveVNodeTree(
      h(Layout, {}, h(CounterLabel, { key: "count-1", count: 3 })),
    );

    expect(collectNodeTypes(resolvedVnode)).toEqual(["ELEMENT_NODE", "ELEMENT_NODE", "TEXT_NODE"]);
  });
});

function collectNodeTypes(vnode) {
  if (vnode.nodeType === "TEXT_NODE") {
    return ["TEXT_NODE"];
  }

  return [
    vnode.nodeType,
    ...(vnode.children ?? []).flatMap(collectNodeTypes),
  ];
}
