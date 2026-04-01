import { NodeType, elementNode } from "../constants.js";
import { withRenderContext } from "./context.js";
import { normalizeComponentResult } from "./createElement.js";

export function resolveVNodeTree(vnode, instance = null) {
  return resolveNode(vnode, instance);
}

function resolveNode(vnode, instance) {
  if (!vnode || typeof vnode !== "object" || typeof vnode.nodeType !== "string") {
    throw new TypeError("Invalid vnode.");
  }

  if (vnode.nodeType === NodeType.TEXT) {
    return {
      nodeType: NodeType.TEXT,
      value: vnode.value,
    };
  }

  if (vnode.nodeType === NodeType.ELEMENT) {
    return elementNode(
      vnode.type,
      vnode.props ?? {},
      (vnode.children ?? []).map((child) => resolveNode(child, instance)),
      vnode.key ?? null,
    );
  }

  if (vnode.nodeType === NodeType.COMPONENT) {
    const component = vnode.component;

    if (typeof component !== "function") {
      throw new TypeError("Invalid component vnode.");
    }

    instance?.trackComponentRender(component, vnode.key ?? null);

    const nextVnode = withRenderContext(instance, "child", () =>
      normalizeComponentResult(component(vnode.props ?? {})),
    );
    const resolvedNode = resolveNode(nextVnode, instance);

    if (resolvedNode.nodeType === NodeType.COMPONENT) {
      throw new Error("Resolved tree cannot contain component nodes.");
    }

    return resolvedNode;
  }

  throw new TypeError("Invalid vnode.");
}
