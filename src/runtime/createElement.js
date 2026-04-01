import { NodeType, elementNode, textNode } from "../constants.js";
import { getCurrentInstance, withRenderContext } from "./context.js";

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
  const normalizedProps = normalizeProps(props);

  // props.children과 나머지 children을 합쳐서 하나의 배열로 정규화
  const normalizedChildren = normalizeChildren([
    ...(Array.isArray(props?.children) ? props.children : props?.children != null ? [props.children] : []),
    ...children,
  ]);

  // type이 함수 → 함수형 컴포넌트이므로 실행해서 vnode를 얻는다
  if (typeof type === "function") {
    return renderChildComponent(type, { ...normalizedProps, children: normalizedChildren });
  }

  // type이 문자열이 아니거나 빈 문자열이면 잘못된 타입
  if (typeof type !== "string" || type.trim() === "") {
    throw new TypeError("Invalid component type.");
  }

  // HTML 태그 → { nodeType: "ELEMENT_NODE", type, props, children } 형태의 vnode 반환
  return elementNode(type, normalizedProps, normalizedChildren);
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
 * 자식 함수형 컴포넌트를 렌더링한다.
 * 현재 렌더 중인 부모 인스턴스의 컨텍스트 안에서 실행하여
 * hooks(useState 등)가 올바른 인스턴스에 바인딩되도록 보장한다.
 */
function renderChildComponent(component, props) {
  const instance = getCurrentInstance();

  if (instance && typeof instance.recordRenderTrace === "function") {
    instance.recordRenderTrace(component, props);
  }

  return withRenderContext(instance, "child", () => normalizeComponentResult(component(props)));
}

/**
 * props 객체를 정규화한다.
 * - null이면 빈 객체로
 * - key, children은 vnode 트리 구성에만 쓰이므로 props에서 제거
 */
function normalizeProps(props) {
  if (props == null) {
    return {};
  }

  if (typeof props !== "object" || Array.isArray(props)) {
    throw new TypeError("Invalid props.");
  }

  const { key: _ignoredKey, children: _ignoredChildren, ...rest } = props;
  return rest;
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
 *
 * 처리 규칙:
 *   배열         → 재귀적으로 각 요소를 다시 처리 (중첩 배열 평탄화)
 *   null/boolean → 무시 (렌더링할 것이 없음)
 *   string/number → textNode로 변환 후 추가
 *   vnode 객체   → 그대로 추가
 *   그 외        → 에러
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

/**
 * 값이 유효한 vnode인지 확인한다.
 * vnode = { nodeType: "TEXT_NODE" | "ELEMENT_NODE", ... } 형태의 객체
 */
function isVnode(value) {
  return value !== null && typeof value === "object" && typeof value.nodeType === "string" &&
    (value.nodeType === NodeType.TEXT || value.nodeType === NodeType.ELEMENT);
}
