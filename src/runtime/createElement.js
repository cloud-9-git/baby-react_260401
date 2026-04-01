import { NodeType, componentNode, elementNode, textNode } from "../constants.js";

/**
 * Virtual DOM 노드를 생성하는 핵심 함수 (React.createElement 역할)
 *
 * JSX가 변환되면 이 함수가 호출된다.
 *   <div className="a">hello</div>
 *   → createElement("div", { className: "a" }, "hello")
 *
 * @param {string|Function} type - HTML 태그명("div") 또는 컴포넌트 함수
 * @param {object|null}     props - 속성 객체 (className, onClick 등)
 * @param {...any}           children - 자식 요소들 (텍스트, vnode, 배열 등)
 * @returns {object} vnode (Virtual DOM 노드)
 */
export function createElement(type, props, ...children) {
  const { rest: normalizedProps, key: vnodeKey, propChildren } = splitProps(props);

  const normalizedChildren = normalizeChildren([
    ...propChildren,
    ...children,
  ]);

  if (typeof type === "function") {
    return componentNode(type, { ...normalizedProps, children: normalizedChildren }, vnodeKey);
  }

  if (typeof type !== "string" || type.trim() === "") {
    throw new TypeError("Invalid component type.");
  }

  return elementNode(type, normalizedProps, normalizedChildren, vnodeKey);
}

/**
 * 컴포넌트 함수의 리턴값을 유효한 vnode로 정규화
 *
 * 컴포넌트가 반환할 수 있는 값:
 *   - null / undefined / boolean → 빈 텍스트 노드 (아무것도 렌더링하지 않음)
 *   - string / number            → 텍스트 노드
 *   - vnode 객체                 → 그대로 사용
 *   - 배열                       → 지원하지 않음 (단일 루트만 허용)
 */
export function normalizeComponentResult(value) {
  if (Array.isArray(value)) {
    throw new TypeError("Component must return a single vnode.");
  }

  if (value == null || typeof value === "boolean") {
    return textNode("");
  }

  if (typeof value === "string" || typeof value === "number") {
    return textNode(String(value));
  }

  if (isVnode(value)) {
    return value;
  }

  throw new TypeError("Invalid component output.");
}

/**
 * props 객체를 정규화한다.
 * - null이면 빈 객체로
 * - key, children은 vnode 트리 구성에만 쓰이므로 props에서 제거
 */
function splitProps(props) {
  if (props == null) {
    return { rest: {}, key: null, propChildren: [] };
  }

  if (typeof props !== "object" || Array.isArray(props)) {
    throw new TypeError("Invalid props.");
  }

  const { key, children: propChildrenValue, ...rest } = props;
  return {
    rest,
    key: key ?? null,
    propChildren:
      Array.isArray(propChildrenValue)
        ? propChildrenValue
        : propChildrenValue != null
          ? [propChildrenValue]
          : [],
  };
}

/**
 * children 배열을 평탄화(flatten)하고, 각 요소를 vnode로 변환한다.
 * [["a", "b"], "c"]  →  [textNode("a"), textNode("b"), textNode("c")]
 */
function normalizeChildren(children) {
  const normalized = [];

  for (const child of children) {
    appendChild(normalized, child);
  }

  return normalized;
}

/**
 * 단일 child를 처리하여 target 배열에 추가한다.
 */
function appendChild(target, child) {
  if (Array.isArray(child)) {
    for (const nestedChild of child) {
      appendChild(target, nestedChild);
    }

    return;
  }

  if (child == null || typeof child === "boolean") {
    return;
  }

  if (typeof child === "string" || typeof child === "number") {
    target.push(textNode(String(child)));
    return;
  }

  if (isVnode(child)) {
    target.push(child);
    return;
  }

  throw new TypeError("Invalid child vnode.");
}

function isVnode(value) {
  return value !== null && typeof value === "object" && typeof value.nodeType === "string" &&
    (
      value.nodeType === NodeType.TEXT ||
      value.nodeType === NodeType.ELEMENT ||
      value.nodeType === NodeType.COMPONENT
    );
}
