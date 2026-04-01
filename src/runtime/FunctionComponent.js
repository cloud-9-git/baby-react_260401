import { applyPatches } from "../lib/applyPatches.js";
import { diff } from "../lib/diff.js";
import { renderTo } from "../lib/renderTo.js";
import { withRenderContext } from "./context.js";
import { normalizeComponentResult } from "./createElement.js";
import { resolveVNodeTree } from "./resolveVNodeTree.js";

/**
 * 함수형 컴포넌트의 "인스턴스"를 관리하는 클래스
 *
 * React에서 <App /> 하나를 렌더링하면 내부적으로 이런 인스턴스가 생긴다.
 * 이 인스턴스가 다음을 모두 관리한다:
 *   - 컴포넌트 함수 실행 (renderComponent)
 *   - hooks 상태 저장 (hooks 배열)
 *   - Virtual DOM 비교 & 실제 DOM 업데이트 (mount / update)
 *   - useEffect 실행 (flushEffects)
 *   - 리렌더 스케줄링 (scheduleUpdate)
 */
export class FunctionComponent {
  /**
   * @param {Function}    renderFn  - 컴포넌트 함수 (예: function App(props) { ... })
   * @param {object|null} props     - 컴포넌트에 전달할 속성
   * @param {HTMLElement}  container - 렌더링할 DOM 컨테이너 (예: document.getElementById("root"))
   */
  constructor(renderFn, props, container) {
    if (typeof renderFn !== "function") {
      throw new TypeError("renderFn must be a function.");
    }

    if (!container || typeof container.replaceChildren !== "function") {
      throw new TypeError("container must be a DOM element.");
    }

    this.renderFn = renderFn;            // 컴포넌트 함수 자체
    this.props = props ?? {};             // 외부에서 전달받은 props
    this.container = container;           // 렌더링 대상 DOM 요소

    this.hooks = [];                      // useState, useEffect 등의 상태를 순서대로 저장하는 배열
    this.hookIndex = 0;                   // 현재 렌더에서 몇 번째 hook을 처리 중인지

    this.currentVdom = null;              // 마지막으로 렌더된 Virtual DOM 트리
    this.currentRootDom = null;           // 현재 container에 붙어 있는 실제 DOM 노드

    this.pendingEffects = [];             // 이번 렌더에서 실행 대기 중인 useEffect 목록
    this.isMounted = false;               // mount()가 완료되었는지
    this.isUpdateScheduled = false;       // 리렌더가 이미 예약되었는지 (중복 방지용)

    this.debugListeners = new Set();
    this.renderCount = 0;
    this.lastPatches = [];
    this.renderTrace = [];
    this.lastAction = null;
    this.currentRenderReason = null;
    this.pendingUpdateReason = null;
  }

  /**
   * 최초 렌더링 (첫 화면 그리기)
   *
   * 흐름: 컴포넌트 실행 → vdom 생성 → 실제 DOM으로 변환 → container에 삽입 → effect 실행
   */
  mount() {
    const nextVdom = this.renderComponent("mount");

    this.currentVdom = nextVdom;
    this.lastPatches = [];
    renderTo(this.container, nextVdom);                // vdom → 실제 DOM으로 변환 후 container에 삽입
    this.currentRootDom = this.container.firstChild ?? null;
    this.isMounted = true;
    this.flushEffects();                               // useEffect 콜백 실행
    this.notifyDebug();

    return this.currentRootDom;
  }

  /**
   * 리렌더링 (상태 변경 후 화면 갱신)
   *
   * 흐름: 컴포넌트 재실행 → 새 vdom 생성 → 이전 vdom과 diff → 패치(최소 변경)만 DOM에 적용
   */
  update(reason = "update") {
    // 아직 mount 안 됐으면 mount부터
    if (!this.isMounted) {
      return this.mount();
    }

    const previousVdom = this.currentVdom;
    const nextVdom = this.renderComponent(reason);     // 컴포넌트 함수 다시 실행 → 새 vdom

    this.currentVdom = nextVdom;

    // 이전에 렌더된 DOM이 없으면 (예: 빈 텍스트였던 경우) 전체를 새로 그림
    if (!this.currentRootDom) {
      this.lastPatches = [];
      renderTo(this.container, nextVdom);
      this.currentRootDom = this.container.firstChild ?? null;
      this.flushEffects();
      this.notifyDebug();
      return this.currentRootDom;
    }

    // 이전 vdom과 새 vdom을 비교하여 차이(patches)를 계산
    const patches = diff(previousVdom, nextVdom);
    this.lastPatches = patches.map(summarizePatch);

    if (patches.length > 0) {
      // 차이가 있으면 최소한의 DOM 조작만 수행
      const nextRootDom = applyPatches(this.currentRootDom, patches);

      if (nextRootDom === null) {
        // 루트 노드 자체가 교체된 경우 → 전체 다시 렌더
        renderTo(this.container, nextVdom);
        this.currentRootDom = this.container.firstChild ?? null;
      } else {
        this.currentRootDom = nextRootDom;
      }
    }

    this.flushEffects();
    this.notifyDebug();
    return this.currentRootDom;
  }

  /**
   * 현재 hookIndex를 반환하고 1 증가시킨다.
   * useState, useEffect 등 각 hook이 호출될 때마다 이걸 사용해서
   * hooks 배열에서 자기 자리(인덱스)를 확보한다.
   *
   * 예: 컴포넌트에 useState가 3개 있으면
   *     첫 번째 useState → index 0
   *     두 번째 useState → index 1
   *     세 번째 useState → index 2
   */
  consumeHookIndex() {
    const currentIndex = this.hookIndex;
    this.hookIndex += 1;
    return currentIndex;
  }

  /**
   * useEffect의 콜백을 대기열에 추가한다.
   * 렌더링이 끝난 뒤 flushEffects()에서 일괄 실행된다.
   */
  queueEffect(index, effect) {
    this.pendingEffects.push({ index, effect });
  }

  /**
   * 리렌더를 예약한다. (setState가 호출하는 메서드)
   *
   * queueMicrotask를 사용하여 현재 실행 흐름이 끝난 뒤 update()를 호출한다.
   * → 같은 이벤트 핸들러에서 setState를 여러 번 호출해도 렌더는 한 번만 일어난다. (배치)
   */
  /**
   * Batching의 핵심 원리:
   *
   * JS는 싱글 스레드이므로, 동기 코드가 전부 끝나야 비동기(microtask)가 실행된다.
   *
   *   handleClick() {
   *     setA(1);   ← scheduleUpdate() 호출 → isUpdateScheduled = true, microtask 예약
   *     setB(2);   ← scheduleUpdate() 호출 → 이미 true → 즉시 return (무시)
   *     setC(3);   ← scheduleUpdate() 호출 → 이미 true → 즉시 return (무시)
   *   }            ← 동기 코드 끝
   *                ← 이제 microtask 실행 → update() 1번 → 렌더 1번
   *
   * 즉, isUpdateScheduled 플래그 하나로
   * "여러 setState → 렌더 1번"을 보장하는 구조다.
   */
  scheduleUpdate(reason = "update") {
    if (this.isUpdateScheduled) {
      return;
    }

    this.pendingUpdateReason = reason;
    this.isUpdateScheduled = true;
    this.notifyDebug();

    queueMicrotask(() => {
      this.isUpdateScheduled = false;
      const nextReason = this.pendingUpdateReason ?? "update";

      this.pendingUpdateReason = null;
      this.update(nextReason);
    });
  }

  /**
   * 컴포넌트 함수를 실행하여 vdom을 얻는다.
   *
   * hookIndex를 0으로 리셋 → 함수 실행 시 hook들이 순서대로 다시 0번부터 읽음
   * withRenderContext로 감싸서 hook들이 이 인스턴스(this)에 바인딩되도록 한다.
   */
  renderComponent(reason = this.isMounted ? "update" : "mount") {
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.renderTrace = [];
    this.currentRenderReason = reason;

    try {
      const unresolvedVdom = withRenderContext(this, "root", () => {
        this.trackComponentRender(this.renderFn);
        return normalizeComponentResult(this.renderFn(this.props));
      });
      const resolvedVdom = resolveVNodeTree(unresolvedVdom, this);

      this.renderCount += 1;
      return resolvedVdom;
    } finally {
      this.currentRenderReason = null;
    }
  }

  /**
   * 대기 중인 useEffect 콜백들을 실행한다.
   *
   * 각 effect에 대해:
   *   1. 이전 cleanup 함수가 있으면 먼저 실행 (정리)
   *   2. 새 effect 콜백 실행
   *   3. 반환값이 함수면 다음 cleanup으로 저장
   */
  flushEffects() {
    const effectsToRun = this.pendingEffects;
    this.pendingEffects = [];

    for (const { index, effect } of effectsToRun) {
      const hook = this.hooks[index];

      if (!hook || hook.kind !== "effect") {
        continue;
      }

      // 이전 effect의 cleanup 실행 (예: 이벤트 리스너 해제, 타이머 정리)
      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      // 새 effect 실행 & cleanup 저장
      const cleanup = effect();
      hook.cleanup = typeof cleanup === "function" ? cleanup : null;
    }
  }

  trackComponentRender(component, key = null) {
    const renderEntry = {
      name: getComponentName(component),
      reason: this.currentRenderReason ?? "update",
    };

    if (key != null) {
      renderEntry.key = key;
    }

    this.renderTrace.push(renderEntry);
  }

  getDebugSnapshot() {
    return {
      renderCount: this.renderCount,
      isMounted: this.isMounted,
      isUpdateScheduled: this.isUpdateScheduled,
      lastPatches: cloneDebugValue(this.lastPatches),
      renderTrace: cloneDebugValue(this.renderTrace),
      lastAction: cloneDebugValue(this.lastAction),
    };
  }

  subscribeDebug(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Debug listener must be a function.");
    }

    this.debugListeners.add(listener);

    return () => {
      this.debugListeners.delete(listener);
    };
  }

  recordAction(action) {
    this.lastAction = cloneDebugValue(action);
    this.notifyDebug();
    return cloneDebugValue(this.lastAction);
  }

  notifyDebug() {
    const snapshot = this.getDebugSnapshot();

    for (const listener of this.debugListeners) {
      listener(snapshot);
    }
  }
}

function summarizePatch(patch) {
  return {
    type: patch.type,
    path: [...(patch.path ?? [])],
    summary: describePatch(patch),
  };
}

function describePatch(patch) {
  switch (patch.type) {
    case "TEXT":
      return `text -> ${String(patch.value ?? "")}`;
    case "PROPS":
      return `props: ${Object.keys(patch.props ?? {}).join(", ")}`;
    case "ADD":
      return `add ${describeNode(patch.node)}`;
    case "REMOVE":
      return "remove node";
    case "REPLACE":
      return `replace with ${describeNode(patch.node)}`;
    default:
      return "patch applied";
  }
}

function describeNode(node) {
  if (!node || typeof node !== "object") {
    return "node";
  }

  if (node.nodeType === "TEXT_NODE") {
    return `text(${String(node.value ?? "")})`;
  }

  if (node.nodeType === "ELEMENT_NODE") {
    return `<${node.type}>`;
  }

  return "node";
}

function getComponentName(component) {
  return component.displayName || component.name || "Anonymous";
}

function cloneDebugValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneDebugValue);
  }

  if (value && typeof value === "object") {
    const cloned = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      cloned[key] = cloneDebugValue(nestedValue);
    }

    return cloned;
  }

  return value;
}
