// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../../src/demo/app/data.js";
import { mountEmojiReactionBoard } from "../../src/demo/main.js";

async function flushUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

function mountApp() {
  const container = document.createElement("div");
  document.body.append(container);
  return {
    container,
    app: mountEmojiReactionBoard(container),
  };
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

function clickEmoji(container, emojiId) {
  container.querySelector(`[data-emoji-id="${emojiId}"]`)?.click();
}

describe("EmojiReactionBoardApp", () => {
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

  it("저장 snapshot이 있으면 mount 시 자동 복구하고 메트릭과 title을 맞춘다", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        votes: {
          grin: 1,
          fire: 4,
          rocket: 2,
          sparkles: 0,
          party: 0,
          heart: 0,
          pizza: 0,
          rainbow: 0,
          avocado: 0,
          idea: 0,
          unicorn: 0,
          wave: 0,
          donut: 0,
          pixel: 0,
          balloon: 0,
          lab: 0,
          genome: 0,
          robot: 0,
          earth: 0,
          gem: 0,
        },
        selectedEmoji: "fire",
        recentReactions: [
          {
            id: "reaction-1",
            emojiId: "fire",
            emoji: "🔥",
            label: "불꽃",
            guestName: "김하늘",
            guestInitials: "하",
            guestAvatarClassName: "bg-tertiary-fixed text-on-tertiary-fixed",
            timestamp: 1712345678,
          },
        ],
        savedAt: 1712345678,
        lastAction: {
          type: "save",
          payload: { totalVotes: 7 },
          timestamp: 1712345678,
          summary: "7표를 브라우저 저장소에 저장했습니다.",
          renderTraceHints: [],
          patchSummaryHints: [],
        },
      }),
    );

    const { container } = mountApp();

    expect(container.querySelector('[data-role="metric-total"]')?.textContent).toContain("7");
    expect(container.querySelector('[data-role="metric-leader"]')?.textContent).toContain("불꽃");
    expect(container.querySelector('[data-role="metric-percentage"]')?.textContent).toContain("57.1");
    expect(container.querySelector('[data-emoji-id="fire"]')?.className).toContain("border-4");
    expect(document.title).toBe("베이비 리액트 이모지 보드 · 🔥 총 7표");
  });

  it("emoji 클릭 시 메트릭, recent activity, lastAction이 함께 갱신된다", async () => {
    const { container, app } = mountApp();

    clickEmoji(container, "rocket");
    await flushUpdates();
    clickEmoji(container, "rocket");
    await flushUpdates();

    expect(container.querySelector('[data-role="metric-total"]')?.textContent).toContain("2");
    expect(container.querySelector('[data-role="metric-leader"]')?.textContent).toContain("로켓");
    expect(container.querySelector('[data-role="metric-percentage"]')?.textContent).toContain("100.0");
    expect(container.querySelector('[data-role="recent-activity"]')?.textContent).toContain("에 반응했어요");
    expect(app.getDebugSnapshot().lastAction?.type).toBe("react");
    expect(app.getDebugSnapshot().lastAction?.payload?.emojiId).toBe("rocket");
  });

  it("Save 클릭 시 localStorage payload와 savedAt이 기록된다", async () => {
    const { container } = mountApp();

    clickEmoji(container, "fire");
    await flushUpdates();
    container.querySelector('[data-action="save"]')?.click();
    await flushUpdates();

    const persistedValue = JSON.parse(localStorage.getItem(STORAGE_KEY));

    expect(persistedValue.votes.fire).toBe(1);
    expect(typeof persistedValue.savedAt).toBe("number");
    expect(container.querySelector('[data-role="saved-at"]')?.textContent).not.toContain("아직 저장하지 않음");
  });

  it("Reset은 라이브 상태만 초기화하고 저장 snapshot은 유지한다", async () => {
    const { container } = mountApp();

    clickEmoji(container, "fire");
    await flushUpdates();
    container.querySelector('[data-action="save"]')?.click();
    await flushUpdates();
    clickEmoji(container, "rocket");
    await flushUpdates();
    container.querySelector('[data-action="reset"]')?.click();
    await flushUpdates();

    const persistedValue = JSON.parse(localStorage.getItem(STORAGE_KEY));

    expect(container.querySelector('[data-role="metric-total"]')?.textContent).toContain("0");
    expect(container.querySelector('[data-role="recent-activity"]')?.textContent).toContain("아직 반응이 없어요");
    expect(persistedValue.votes.fire).toBe(1);
    expect(persistedValue.votes.rocket).toBe(0);
  });

  it("Restore는 마지막 저장 상태를 다시 라이브 상태에 적용한다", async () => {
    const { container, app } = mountApp();

    clickEmoji(container, "fire");
    await flushUpdates();
    container.querySelector('[data-action="save"]')?.click();
    await flushUpdates();
    clickEmoji(container, "rocket");
    await flushUpdates();
    container.querySelector('[data-action="reset"]')?.click();
    await flushUpdates();
    container.querySelector('[data-action="restore"]')?.click();
    await flushUpdates();

    expect(container.querySelector('[data-role="metric-total"]')?.textContent).toContain("1");
    expect(container.querySelector('[data-role="metric-leader"]')?.textContent).toContain("불꽃");
    expect(app.getDebugSnapshot().lastAction?.type).toBe("restore");
  });

  it("루트 렌더 안에 data-panel-root placeholder가 존재하고 비어 있다", () => {
    const { container } = mountApp();
    const panelRoot = container.querySelector("[data-panel-root]");

    expect(panelRoot).not.toBeNull();
    expect(panelRoot?.childElementCount).toBe(0);
    expect(panelRoot?.textContent).toBe("");
  });
});
