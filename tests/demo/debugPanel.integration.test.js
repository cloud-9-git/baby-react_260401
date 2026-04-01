// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { mountDemoPage } from "../../src/demo/main.js";
import { formatDebugPanelModel } from "../../src/debug/debugSnapshot.js";

async function flushUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function mountPage() {
  const appContainer = document.createElement("div");
  const debugContainer = document.createElement("div");
  document.body.append(appContainer, debugContainer);

  return {
    appContainer,
    debugContainer,
    ...mountDemoPage(appContainer, debugContainer),
  };
}

describe("demo page debug panel integration", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();

    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });

    document.body.innerHTML = "";
    document.title = "";
    localStorage.clear();
  });

  it("데모앱과 디버그 패널을 같은 페이지에서 함께 mount한다", () => {
    const { appContainer, debugContainer, app } = mountPage();
    const model = formatDebugPanelModel(app.getDebugSnapshot());

    expect(appContainer.querySelector('[data-role="board-main"]')).not.toBeNull();
    expect(debugContainer.querySelector('[data-role="debug-panel"]')).not.toBeNull();
    expect(debugContainer.textContent).toContain(model.renderTraceItems[0].label);
    expect(debugContainer.textContent).toContain(String(model.renderCount));
  });

  it("사용자 상호작용 후 공개 debug snapshot 값이 패널에 반영된다", async () => {
    const { appContainer, debugContainer, app } = mountPage();

    appContainer.querySelector('[data-action="load-sample"]')?.click();
    await flushUpdates();

    const snapshot = app.getDebugSnapshot();
    const model = formatDebugPanelModel(snapshot);

    expect(snapshot.lastAction?.type).toBe("load-sample");
    expect(model.renderTraceItems.length).toBeGreaterThan(0);
    expect(model.patchItems.length).toBeGreaterThan(0);
    expect(debugContainer.textContent).toContain(model.actionText);
    expect(debugContainer.textContent).toContain(model.renderTraceItems[0].label);
    expect(debugContainer.textContent).toContain(model.patchItems[0].label);
  });
});
