// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { mountDebugPanel } from "../../src/demo/main.js";
import { createMockDebugSource } from "../../src/debug/debugStore.js";
import {
  createEmptyDebugSnapshot,
  createMockDebugSnapshot,
  formatDebugAction,
  formatPatchSummaryEntry,
} from "../../src/debug/debugSnapshot.js";

async function flushUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("DebugPanelApp", () => {
  it("empty snapshot을 fallback 텍스트와 함께 렌더한다", () => {
    const container = document.createElement("div");
    const source = createMockDebugSource(createEmptyDebugSnapshot());

    mountDebugPanel(container, source);

    expect(container.textContent).toContain("No action yet");
    expect(container.textContent).toContain("No render trace yet");
    expect(container.textContent).toContain("No patches recorded");
    expect(container.textContent).toContain("Render Count");
    expect(container.textContent).toContain("0");
  });

  it("populated snapshot을 action, render trace, patch summary로 렌더한다", () => {
    const container = document.createElement("div");
    const source = createMockDebugSource(
      createMockDebugSnapshot({
        lastAction: {
          type: "react",
          payload: { emoji: "wow" },
        },
        renderTrace: [
          { name: "App", reason: "state[0] updated" },
          { name: "ReactionButton", reason: "rendered with parent update", key: "wow" },
        ],
        lastPatches: [
          { type: "TEXT", path: [0, 1, 0], summary: 'text -> "3 votes"' },
          { type: "PROPS", path: [1, 0], summary: "className" },
        ],
      }),
    );

    mountDebugPanel(container, source);

    expect(container.textContent).toContain('react: emoji="wow"');
    expect(container.textContent).toContain("App - state[0] updated");
    expect(container.textContent).toContain("ReactionButton [wow] - rendered with parent update");
    expect(container.textContent).toContain('TEXT @ [0,1,0]: text -> "3 votes"');
    expect(container.textContent).toContain("PROPS @ [1,0]: className");
  });

  it("subscribeDebug 갱신을 받아 패널 내용을 업데이트한다", async () => {
    const container = document.createElement("div");
    const source = createMockDebugSource(createEmptyDebugSnapshot());

    mountDebugPanel(container, source);

    source.patchSnapshot({
      renderCount: 5,
      lastAction: {
        type: "reset",
        payload: { tag: "button" },
      },
      renderTrace: [{ name: "App", reason: "state[2] updated" }],
      lastPatches: [{ type: "REMOVE", path: [2], summary: "removed node" }],
    });
    await flushUpdates();

    expect(container.textContent).toContain("5");
    expect(container.textContent).toContain('reset: tag="button"');
    expect(container.textContent).toContain("App - state[2] updated");
    expect(container.textContent).toContain("REMOVE @ [2]: removed node");
  });

  it("탭 버튼으로 action, render, patch 섹션을 전환한다", async () => {
    const container = document.createElement("div");
    const source = createMockDebugSource(
      createMockDebugSnapshot({
        renderTrace: [{ name: "App", reason: "state[0] updated" }],
        lastPatches: [{ type: "TEXT", path: [0], summary: "updated label" }],
      }),
    );

    mountDebugPanel(container, source);

    const actionPanel = container.querySelector('[data-role="debug-tab-panel-action"]');
    const renderPanel = container.querySelector('[data-role="debug-tab-panel-render"]');
    const patchPanel = container.querySelector('[data-role="debug-tab-panel-patch"]');

    expect(actionPanel?.hasAttribute("hidden")).toBe(false);
    expect(renderPanel?.hasAttribute("hidden")).toBe(true);
    expect(patchPanel?.hasAttribute("hidden")).toBe(true);

    container.querySelector('[data-tab="render"]')?.click();
    await flushUpdates();

    expect(actionPanel?.hasAttribute("hidden")).toBe(true);
    expect(renderPanel?.hasAttribute("hidden")).toBe(false);

    container.querySelector('[data-tab="patch"]')?.click();
    await flushUpdates();

    expect(renderPanel?.hasAttribute("hidden")).toBe(true);
    expect(patchPanel?.hasAttribute("hidden")).toBe(false);
  });
});

describe("debug snapshot formatting", () => {
  it("payload와 patch path를 읽기 좋은 문자열로 포맷한다", () => {
    expect(formatDebugAction({ type: "save", payload: { count: 3, scope: "board" } })).toBe(
      'save: count=3, scope="board"',
    );
    expect(formatPatchSummaryEntry({ type: "PROPS", path: [1, 2], summary: "className" })).toBe(
      "PROPS @ [1,2]: className",
    );
  });
});
