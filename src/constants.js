export const NodeType = Object.freeze({
  TEXT: "TEXT_NODE",
  ELEMENT: "ELEMENT_NODE",
  COMPONENT: "COMPONENT_NODE",
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
  return { nodeType: NodeType.ELEMENT, type, props, children, key };
}

export function componentNode(component, props = {}, key = null) {
  return { nodeType: NodeType.COMPONENT, component, props, key };
}

export const PatchType = Object.freeze({
  TEXT: "TEXT",
  REPLACE: "REPLACE",
  PROPS: "PROPS",
  ADD: "ADD",
  REMOVE: "REMOVE",
});
