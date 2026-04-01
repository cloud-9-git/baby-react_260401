// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  FunctionComponent,
  createElement,
  useDebugControls,
  useEffect,
  useMemo,
  useState,
} from "../../src/lib.js";
import { elementNode, textNode } from "../../src/constants.js";

const h = createElement;

async function flushUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("FunctionComponent runtime", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "";
  });

  it("mount 후 상태 업데이트가 patch로 적용되어 sibling DOM identity를 유지한다", async () => {
    const actions = {};
    const container = document.createElement("div");

    function App() {
      const [count, setCount] = useState(0);
      const [label, setLabel] = useState("alpha");

      actions.setCount = setCount;
      actions.setLabel = setLabel;

      return h(
        "div",
        { id: "root" },
        h("span", { id: "count" }, String(count)),
        h("span", { id: "label" }, label),
      );
    }

    const instance = new FunctionComponent(App, {}, container);
    const mountedRoot = instance.mount();
    const labelNode = container.querySelector("#label");

    actions.setCount(1);
    await flushUpdates();
    actions.setLabel("beta");
    await flushUpdates();

    expect(instance.hooks).toHaveLength(2);
    expect(container.querySelector("#count")?.textContent).toBe("1");
    expect(container.querySelector("#label")?.textContent).toBe("beta");
    expect(container.querySelector("#label")).toBe(labelNode);
    expect(container.firstChild).toBe(mountedRoot);
  });

  it("함수형 setState를 지원한다", async () => {
    const actions = {};
    const container = document.createElement("div");

    function App() {
      const [count, setCount] = useState(1);
      actions.bump = () => setCount((previousCount) => previousCount + 2);

      return h("div", {}, h("span", { id: "count" }, String(count)));
    }

    new FunctionComponent(App, {}, container).mount();

    actions.bump();
    await flushUpdates();

    expect(container.querySelector("#count")?.textContent).toBe("3");
  });

  it("같은 tick의 여러 setState를 한 번의 update로 batching한다", async () => {
    const actions = {};
    const container = document.createElement("div");

    function App() {
      const [count, setCount] = useState(0);
      const [label, setLabel] = useState("ready");

      actions.setCount = setCount;
      actions.setLabel = setLabel;

      return h(
        "div",
        {},
        h("span", { id: "count" }, String(count)),
        h("span", { id: "label" }, label),
      );
    }

    const instance = new FunctionComponent(App, {}, container);
    instance.mount();

    let updateCalls = 0;
    const originalUpdate = instance.update.bind(instance);
    instance.update = (...args) => {
      updateCalls += 1;
      return originalUpdate(...args);
    };

    actions.setCount(1);
    actions.setLabel("patched");
    actions.setCount((previousCount) => previousCount + 1);
    await flushUpdates();

    expect(updateCalls).toBe(1);
    expect(container.querySelector("#count")?.textContent).toBe("2");
    expect(container.querySelector("#label")?.textContent).toBe("patched");
  });

  it("useEffect가 deps 변경 시 cleanup 이후 다시 실행된다", async () => {
    const actions = {};
    const logs = [];
    const container = document.createElement("div");

    function App() {
      const [count, setCount] = useState(0);
      actions.setCount = setCount;

      useEffect(() => {
        logs.push(`effect:${count}`);
        return () => logs.push(`cleanup:${count}`);
      }, [count]);

      return h("div", {}, String(count));
    }

    new FunctionComponent(App, {}, container).mount();
    expect(logs).toEqual(["effect:0"]);

    actions.setCount(1);
    await flushUpdates();

    expect(logs).toEqual(["effect:0", "cleanup:0", "effect:1"]);

    actions.setCount(1);
    await flushUpdates();

    expect(logs).toEqual(["effect:0", "cleanup:0", "effect:1"]);
  });

  it("useMemo는 deps가 바뀌지 않으면 계산 결과를 재사용한다", async () => {
    const actions = {};
    const container = document.createElement("div");
    let memoCalls = 0;

    function App() {
      const [count, setCount] = useState(2);
      const [query, setQuery] = useState("");

      actions.setCount = setCount;
      actions.setQuery = setQuery;

      const doubled = useMemo(() => {
        memoCalls += 1;
        return count * 2;
      }, [count]);

      return h(
        "div",
        {},
        h("span", { id: "double" }, String(doubled)),
        h("span", { id: "query" }, query),
      );
    }

    new FunctionComponent(App, {}, container).mount();
    expect(memoCalls).toBe(1);

    actions.setQuery("hook");
    await flushUpdates();

    expect(memoCalls).toBe(1);
    expect(container.querySelector("#double")?.textContent).toBe("4");

    actions.setCount(3);
    await flushUpdates();

    expect(memoCalls).toBe(2);
    expect(container.querySelector("#double")?.textContent).toBe("6");
  });

  it("자식 함수형 컴포넌트에서 Hook을 사용하면 에러를 던진다", () => {
    const container = document.createElement("div");

    function Child() {
      useState(0);
      return h("span", {}, "invalid");
    }

    function App() {
      return h("div", {}, h(Child));
    }

    expect(() => new FunctionComponent(App, {}, container).mount()).toThrowError(
      new Error("Hooks can only be used in the root component."),
    );
  });

  it("createElement는 key를 vnode 최상위에 보존하고 원시 children을 정규화한다", () => {
    const vnode = createElement("li", { key: "item-1", "data-kind": "demo" }, "Task ", 1);

    expect(vnode).toEqual(
      elementNode("li", { "data-kind": "demo" }, [textNode("Task "), textNode("1")], "item-1"),
    );
  });

  it("getDebugSnapshot은 render trace와 patch summary를 노출한다", async () => {
    const actions = {};
    const container = document.createElement("div");

    function Label({ value }) {
      return h("span", { id: "label" }, value);
    }

    function App() {
      const [count, setCount] = useState(0);
      actions.setCount = setCount;

      return h(
        "div",
        {},
        h("span", { id: "count" }, String(count)),
        h(Label, { key: "label-1", value: count === 0 ? "zero" : "one" }),
      );
    }

    const instance = new FunctionComponent(App, {}, container);
    instance.mount();

    expect(instance.getDebugSnapshot()).toEqual({
      renderCount: 1,
      isMounted: true,
      isUpdateScheduled: false,
      lastPatches: [],
      renderTrace: [
        { name: "App", reason: "mount" },
        { name: "Label", key: "label-1", reason: "mount" },
      ],
      lastAction: null,
    });

    actions.setCount(1);
    await flushUpdates();

    expect(instance.getDebugSnapshot()).toEqual({
      renderCount: 2,
      isMounted: true,
      isUpdateScheduled: false,
      lastPatches: [
        { type: "TEXT", path: [0, 0], summary: 'text -> "1"' },
        { type: "TEXT", path: [1, 0], summary: 'text -> "one"' },
      ],
      renderTrace: [
        { name: "App", reason: "state[0] updated" },
        { name: "Label", key: "label-1", reason: "state[0] updated" },
      ],
      lastAction: null,
    });
  });

  it("subscribeDebug와 useDebugControls는 lastAction과 스케줄 상태를 전달한다", async () => {
    const actions = {};
    const snapshots = [];
    const container = document.createElement("div");
    const triggerReact = () => actions.react();

    function App() {
      const { recordAction } = useDebugControls();
      const [count, setCount] = useState(0);

      actions.react = () => {
        recordAction({ type: "react", payload: { emoji: "wow" } });
        setCount((previousCount) => previousCount + 1);
      };

      return h("button", { onClick: triggerReact }, String(count));
    }

    const instance = new FunctionComponent(App, {}, container);
    const unsubscribe = instance.subscribeDebug((snapshot) => snapshots.push(snapshot));

    instance.mount();
    actions.react();

    expect(instance.getDebugSnapshot().lastAction).toEqual({
      type: "react",
      payload: { emoji: "wow" },
    });

    await flushUpdates();

    expect(snapshots.some((snapshot) => snapshot.isUpdateScheduled)).toBe(true);
    expect(snapshots.at(-1)).toEqual({
      renderCount: 2,
      isMounted: true,
      isUpdateScheduled: false,
      lastPatches: [
        { type: "TEXT", path: [0], summary: 'text -> "1"' },
      ],
      renderTrace: [
        { name: "App", reason: "state[0] updated" },
      ],
      lastAction: {
        type: "react",
        payload: { emoji: "wow" },
      },
    });

    const snapshotCount = snapshots.length;
    unsubscribe();
    instance.recordAction({ type: "save" });

    expect(snapshots).toHaveLength(snapshotCount);
  });
});
