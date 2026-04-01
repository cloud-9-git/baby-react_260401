export const NodeType = Object.freeze({
  TEXT: "TEXT_NODE",
  ELEMENT: "ELEMENT_NODE",
});

/**
 * 담당: 위승철
 */
export function textNode(value) {
  return { nodeType: NodeType.TEXT, value };
}

/**
 * 담당: 위승철
 */
export function elementNode(type, props = {}, children = [], key = null) {
  return { nodeType: NodeType.ELEMENT, type, props, children, key: key ?? null };
}

export const PatchType = Object.freeze({
  TEXT: "TEXT",
  REPLACE: "REPLACE",
  PROPS: "PROPS",
  ADD: "ADD",
  REMOVE: "REMOVE",
});
