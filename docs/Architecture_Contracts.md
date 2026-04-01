# Architecture Contracts

## 이 문서의 목적

이 문서는 병렬 개발 전에 반드시 고정해야 하는 구현 계약을 모아둔 문서다.

- A는 keyed diff를 구현할 때 이 문서를 기준으로 한다.
- B는 `COMPONENT_NODE`와 resolve 단계를 구현할 때 이 문서를 기준으로 한다.
- C와 D는 이 문서를 바탕으로 mock과 실제 연동 포인트를 맞춘다.

## 1. NodeType 계약

```js
export const NodeType = Object.freeze({
  TEXT: "TEXT_NODE",
  ELEMENT: "ELEMENT_NODE",
  COMPONENT: "COMPONENT_NODE",
});
```

## 2. vnode shape

### TEXT_NODE

```js
{
  nodeType: "TEXT_NODE",
  value: "hello",
}
```

### ELEMENT_NODE

```js
{
  nodeType: "ELEMENT_NODE",
  type: "div",
  props: { className: "card" },
  children: [],
  key: "item-1",
}
```

### COMPONENT_NODE

```js
{
  nodeType: "COMPONENT_NODE",
  component: ReactionButton,
  props: {
    emoji: "wow",
    onReact: fn,
    children: [],
  },
  key: "wow",
}
```

규칙:

- `key`는 vnode 최상위 필드에 둔다.
- `children`은 `componentNode`의 별도 필드가 아니라 `props.children`으로만 전달한다.
- `props.key`는 최종 vnode에 남기지 않는다.

## 3. 팩토리 함수 계약

```js
textNode(value)
elementNode(type, props = {}, children = [], key = null)
componentNode(component, props = {}, key = null)
```

## 4. createElement 계약

### 문자열 type

`createElement("div", props, ...children)`는 `ELEMENT_NODE`를 반환한다.

### 함수 type

`createElement(Component, props, ...children)`는 즉시 실행하지 않고 `COMPONENT_NODE`를 반환한다.

### key 처리

- `key`는 `normalizeProps()` 단계에서 추출한다.
- vnode에는 `key` 필드로 저장한다.
- `props`에는 `key`를 남기지 않는다.

## 5. resolve 단계 계약

신규 파일:

```js
resolveVNodeTree(vnode, instance) => resolvedVnode
```

입력:

- `TEXT_NODE`
- `ELEMENT_NODE`
- `COMPONENT_NODE`

출력:

- `TEXT_NODE`
- `ELEMENT_NODE`

규칙:

- `COMPONENT_NODE`는 resolve 시점에 `component(props)`를 실행한다.
- 실행 결과는 기존 `normalizeComponentResult()` 규칙을 따른다.
- resolve 이후 tree에는 `COMPONENT_NODE`가 남아 있으면 안 된다.
- `diff`, `vdomToDom`, `applyPatches`, `renderTo`는 resolved tree만 받는다.

## 6. Hook 정책

이번 라운드의 Hook 정책은 고정이다.

- Hook은 루트 컴포넌트에서만 사용 가능
- 자식 컴포넌트에서 Hook 사용 금지
- `COMPONENT_NODE` 도입 후에도 이 정책은 유지

즉, `COMPONENT_NODE`의 목적은 상태 분산이 아니라:

- 컴포넌트 경계 보존
- resolve 단계 분리
- 디버그 로그 확장 기반 제공

에 있다.

## 7. PatchType 계약

이번 라운드의 patch type은 기존 5개를 유지한다.

```js
export const PatchType = Object.freeze({
  TEXT: "TEXT",
  REPLACE: "REPLACE",
  PROPS: "PROPS",
  ADD: "ADD",
  REMOVE: "REMOVE",
});
```

규칙:

- `MOVE`는 이번 라운드에서 도입하지 않는다.
- keyed diff는 `ADD/REMOVE/REPLACE/PROPS/TEXT` 조합으로 해결한다.

## 8. key 규칙

- sibling 범위에서 unique해야 한다.
- `null` key는 unkeyed child로 취급한다.
- key가 있는 child는 key 기준으로 매칭한다.
- key가 없는 child는 기존 index 비교를 fallback으로 쓴다.
- key reorder 최적화는 이번 라운드에서 하지 않는다.

## 9. Debug API 계약

`FunctionComponent`는 아래 두 API를 제공한다.

```js
getDebugSnapshot() => DebugSnapshot
subscribeDebug(listener) => unsubscribe
```

## 10. DebugSnapshot shape

최소 스키마:

```js
{
  renderCount: 0,
  isMounted: false,
  isUpdateScheduled: false,
  lastPatches: [],
  renderTrace: [],
  lastAction: null,
}
```

권장 상세 shape:

```js
{
  renderCount: 3,
  isMounted: true,
  isUpdateScheduled: false,
  renderTrace: [
    { name: "App", reason: "state[0] updated" },
    { name: "ReactionSummary", reason: "props updated" },
    { name: "ReactionButton", key: "wow", reason: "count changed" },
  ],
  lastPatches: [
    { type: "TEXT", path: [0, 1, 0], summary: "totalVotes -> 3" },
    { type: "PROPS", path: [1, 2], summary: "button active class updated" },
  ],
  lastAction: {
    type: "react",
    payload: { emoji: "wow" },
  },
}
```

규칙:

- 패널은 이 snapshot만 사용한다.
- 패널은 `instance.hooks` 같은 내부 필드에 직접 접근하지 않는다.

## 11. 테스트 계약

### A가 책임질 테스트

- key가 vnode에 보존되는지
- keyed child matching이 의도대로 되는지
- mixed keyed/unkeyed sibling fallback 동작

### B가 책임질 테스트

- 함수 type이 `COMPONENT_NODE`를 만드는지
- `resolveVNodeTree()`가 `COMPONENT_NODE`를 제거하는지
- 루트 렌더가 resolved tree 기준으로 동작하는지
- root-only hook 정책이 유지되는지

### C가 책임질 테스트

- 반응 클릭, 리셋, 저장, 복구
- 총합/1위/득표율 계산
- 최근 반응 표시

### D가 책임질 테스트

- debug panel snapshot 렌더
- last action / render trace / patch summary 표시
- 데모앱 + 패널 통합 동작

## 12. 충돌 방지 규칙

- `constants.js`와 `createElement.js`는 A/B가 먼저 인터페이스를 잠근 뒤 편집한다.
- B는 `resolveVNodeTree.js`를 새 파일로 만든다.
- C는 가능하면 `src/demo/app/*`로 신규 파일을 만들어 기존 데모와 충돌을 줄인다.
- D는 `src/demo/panel/*`와 `src/debug/*`를 신규로 만든다.
- 기존 `diff`, `applyPatches`, `vdomToDom`는 입력 타입만 명확해지면 수정 범위를 최소화한다.

## 13. 이번 라운드 비목표

- child component hook 지원
- Fiber / concurrent rendering
- `MOVE` patch
- React 수준의 memoization 최적화
- 서버 연동
