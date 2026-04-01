// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../../src/demo/data.js";
import { mountCodingSprintBoard } from "../../src/demo/main.js";

async function flushUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

function mountApp() {
  const container = document.createElement("div");
  document.body.append(container);
  return {
    container,
    app: mountCodingSprintBoard(container),
  };
}

function fillInput(element, value) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function changeSelect(element, value) {
  element.value = value;
  element.dispatchEvent(new Event("change", { bubbles: true }));
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

describe("CodingSprintBoardApp", () => {
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

  it("localStorage에서 상태를 복원하고 title effect를 동기화한다", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks: [
          {
            id: "restore-1",
            title: "복원된 작업",
            status: "todo",
            priority: "high",
            owner: "팀",
            estimate: 3,
          },
        ],
        statusFilter: "all",
        query: "복원",
        notice: "이전 작업을 복원했습니다.",
      }),
    );

    const { container } = mountApp();

    expect(container.textContent).toContain("복원된 작업");
    expect(container.querySelector('input[name="query"]')?.value).toBe("복원");
    expect(document.title).toBe("코딩 스프린트 보드 · 남은 할 일 1개");
  });

  it("폼 입력으로 새 작업을 추가하고 localStorage에 저장한다", async () => {
    const { container } = mountApp();

    fillInput(container.querySelector('input[name="title"]'), "useMemo 설명 정리");
    fillInput(container.querySelector('input[name="owner"]'), "발표 담당");
    fillInput(container.querySelector('input[name="estimate"]'), "6");
    changeSelect(container.querySelector('select[name="priority"]'), "medium");
    await flushUpdates();
    container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await flushUpdates();

    expect(container.textContent).toContain("useMemo 설명 정리");

    const persistedValue = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(persistedValue.tasks.some((task) => task.title === "useMemo 설명 정리")).toBe(true);
  });

  it("검색, 상태 전환, 완료 정리, 샘플 재로드가 모두 동작한다", async () => {
    const { container } = mountApp();
    const searchInput = container.querySelector('input[name="query"]');
    const statusSelect = container.querySelector('select[name="statusFilter"]');

    fillInput(searchInput, "README");
    await flushUpdates();

    expect(container.querySelectorAll('[data-role="task-list"] > li')).toHaveLength(1);
    expect(container.textContent).toContain("README 발표 흐름 정리");

    container.querySelector('[data-action="reset-filters"]')?.click();
    await flushUpdates();

    expect(searchInput.value).toBe("");
    expect(statusSelect.value).toBe("all");

    container.querySelector('[data-task-id="seed-1"] button')?.click();
    await flushUpdates();

    expect(document.title).toBe("코딩 스프린트 보드 · 남은 할 일 1개");
    expect(container.querySelector('[data-task-id="seed-1"]')?.textContent).toContain("Doing");

    container.querySelector('[data-action="remove-completed"]')?.click();
    await flushUpdates();

    expect(container.textContent).not.toContain("README 발표 흐름 정리");

    fillInput(searchInput, "Hook");
    changeSelect(statusSelect, "doing");
    await flushUpdates();
    container.querySelector('[data-action="load-sample"]')?.click();
    await flushUpdates();

    expect(searchInput.value).toBe("");
    expect(statusSelect.value).toBe("all");
    expect(container.querySelectorAll('[data-role="task-list"] > li')).toHaveLength(4);
  });
});
