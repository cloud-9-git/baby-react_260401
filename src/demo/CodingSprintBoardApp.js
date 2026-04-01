import { createElement, useEffect, useMemo, useState } from "../lib.js";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  STORAGE_KEY,
  TASK_STATUSES,
  createDefaultDraft,
  createSampleTasks,
  createTaskId,
} from "./data.js";

const h = createElement;

export function CodingSprintBoardApp() {
  const persistedState = loadBoardState();
  const [tasks, setTasks] = useState(() => persistedState.tasks);
  const [draft, setDraft] = useState(() => createDefaultDraft());
  const [statusFilter, setStatusFilter] = useState(() => persistedState.statusFilter);
  const [query, setQuery] = useState(() => persistedState.query);
  const [notice, setNotice] = useState(() => persistedState.notice);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => matchesTask(task, statusFilter, query)),
    [tasks, statusFilter, query],
  );
  const counts = useMemo(() => createCounts(tasks), [tasks]);
  const completionRate = useMemo(
    () => (tasks.length === 0 ? 0 : Math.round((counts.done / tasks.length) * 100)),
    [counts, tasks],
  );
  const focusTask = useMemo(() => findFocusTask(tasks), [tasks]);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks,
        statusFilter,
        query,
        notice,
      }),
    );
  }, [tasks, statusFilter, query, notice]);

  useEffect(() => {
    document.title = `코딩 스프린트 보드 · 남은 할 일 ${counts.todo}개`;
  }, [counts.todo]);

  const visibleEstimate = filteredTasks.reduce((total, task) => total + task.estimate, 0);
  const totalEstimate = tasks.reduce((total, task) => total + task.estimate, 0);

  function updateDraft(field, value) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const title = draft.title.trim();
    const owner = draft.owner.trim() || "미정";
    const estimate = Number(draft.estimate);

    if (!title) {
      setNotice("작업 제목을 먼저 입력해 주세요.");
      return;
    }

    if (!Number.isFinite(estimate) || estimate <= 0) {
      setNotice("예상 시간은 1 이상의 숫자로 입력해 주세요.");
      return;
    }

    setTasks((previousTasks) => [
      ...previousTasks,
      {
        id: createTaskId(),
        title,
        status: "todo",
        priority: draft.priority,
        owner,
        estimate,
      },
    ]);
    setDraft(createDefaultDraft());
    setNotice(`"${title}" 작업을 추가했습니다.`);
  }

  function handleAdvanceTask(taskId) {
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus(task.status) } : task,
      ),
    );
    setNotice("작업 상태를 다음 단계로 이동했습니다.");
  }

  function handleRemoveCompleted() {
    const completedCount = counts.done;

    if (completedCount === 0) {
      setNotice("정리할 완료 작업이 없습니다.");
      return;
    }

    setTasks((previousTasks) => previousTasks.filter((task) => task.status !== "done"));
    setNotice(`${completedCount}개의 완료 작업을 정리했습니다.`);
  }

  // Batching 동작 예시:
  // 아래 setState 4개가 동기적으로 연속 호출되지만,
  // 첫 번째 setState가 scheduleUpdate()를 호출하면 isUpdateScheduled = true가 되고
  // 나머지 3개는 scheduleUpdate() 안에서 즉시 return된다.
  // 동기 코드가 전부 끝난 뒤 queueMicrotask 콜백이 실행되어
  // update()가 딱 1번만 호출 → 렌더도 1번, DOM patch도 1번.
  function handleLoadSampleSprint() {
    setTasks(createSampleTasks());
    setStatusFilter("all");
    setQuery("");
    setNotice("샘플 스프린트를 다시 불러왔습니다. batching이 한 번만 동작합니다.");
  }

  function handleResetFilters() {
    setStatusFilter("all");
    setQuery("");
    setNotice("필터를 기본값으로 되돌렸습니다.");
  }

  return h(
    "div",
    { className: "board-shell" },
    h(HeaderSummary, {
      counts,
      completionRate,
      focusTask,
      totalEstimate,
    }),
    h(
      "div",
      { className: "board-grid" },
      h(
        "section",
        { className: "board-main", "data-role": "board-main" },
        h(QuickActions, {
          notice,
          completedCount: counts.done,
          onLoadSampleSprint: handleLoadSampleSprint,
          onRemoveCompleted: handleRemoveCompleted,
          onResetFilters: handleResetFilters,
        }),
        h(TaskComposer, {
          draft,
          onSubmit: handleSubmit,
          onDraftChange: updateDraft,
        }),
        h(FilterBar, {
          query,
          statusFilter,
          visibleCount: filteredTasks.length,
          totalCount: tasks.length,
          visibleEstimate,
          onQueryChange: setQuery,
          onFilterChange: setStatusFilter,
        }),
        h(TaskList, {
          tasks: filteredTasks,
          onAdvanceTask: handleAdvanceTask,
        }),
      ),
      h(InsightPanel, {
        counts,
        completionRate,
        focusTask,
        totalEstimate,
        tasks,
      }),
    ),
  );
}

function HeaderSummary({ counts, completionRate, focusTask, totalEstimate }) {
  return h(
    "header",
    { className: "hero-card" },
    h(
      "div",
      { className: "hero-copy" },
      h("p", { className: "eyebrow" }, "수요 코딩회 집중 보드"),
      h("h1", { className: "hero-title" }, "React-like Runtime으로 스프린트를 직접 운영합니다."),
      h(
        "p",
        { className: "hero-description" },
        "루트 컴포넌트에서만 상태와 Hook을 관리하고, 자식 컴포넌트는 props만 받아 렌더링하는 구조입니다.",
      ),
    ),
    h(
      "div",
      { className: "hero-stats" },
      h(SummaryCard, { label: "전체 작업", value: `${counts.total}개`, tone: "sun" }),
      h(SummaryCard, { label: "진행률", value: `${completionRate}%`, tone: "mint" }),
      h(SummaryCard, { label: "남은 시간", value: `${totalEstimate}h`, tone: "sky" }),
      h(
        SummaryCard,
        {
          label: "집중 과제",
          value: focusTask ? focusTask.title : "모든 작업 완료",
          tone: "rose",
        },
      ),
    ),
  );
}

function SummaryCard({ label, value, tone }) {
  return h(
    "article",
    { className: `summary-card tone-${tone}` },
    h("span", { className: "summary-label" }, label),
    h("strong", { className: "summary-value" }, value),
  );
}

function QuickActions({
  notice,
  completedCount,
  onLoadSampleSprint,
  onRemoveCompleted,
  onResetFilters,
}) {
  return h(
    "section",
    { className: "panel-card action-card" },
    h(
      "div",
      { className: "panel-head" },
      h("div", {}, h("h2", {}, "빠른 액션"), h("p", { className: "muted" }, notice)),
      h(
        "div",
        { className: "action-row" },
        h(
          "button",
          {
            type: "button",
            className: "button button-primary",
            "data-action": "load-sample",
            onClick: onLoadSampleSprint,
          },
          "샘플 스프린트 불러오기",
        ),
        h(
          "button",
          {
            type: "button",
            className: "button",
            "data-action": "reset-filters",
            onClick: onResetFilters,
          },
          "필터 초기화",
        ),
        h(
          "button",
          {
            type: "button",
            className: "button",
            "data-action": "remove-completed",
            onClick: onRemoveCompleted,
          },
          `완료 작업 정리 (${completedCount})`,
        ),
      ),
    ),
  );
}

function TaskComposer({ draft, onSubmit, onDraftChange }) {
  return h(
    "section",
    { className: "panel-card" },
    h("div", { className: "panel-head" }, h("h2", {}, "새 작업 추가"), h("p", { className: "muted" }, "루트 상태에 새 작업을 push하고 전체 UI가 patch로 갱신됩니다.")),
    h(
      "form",
      { className: "composer-grid", onSubmit },
      h(
        "label",
        { className: "field span-2" },
        h("span", { className: "field-label" }, "작업 제목"),
        h("input", {
          name: "title",
          value: draft.title,
          placeholder: "예: useEffect cleanup 테스트 작성",
          onInput: (event) => onDraftChange("title", event.target.value),
        }),
      ),
      h(
        "label",
        { className: "field" },
        h("span", { className: "field-label" }, "담당자"),
        h("input", {
          name: "owner",
          value: draft.owner,
          placeholder: "예: 위승철",
          onInput: (event) => onDraftChange("owner", event.target.value),
        }),
      ),
      h(
        "label",
        { className: "field" },
        h("span", { className: "field-label" }, "예상 시간"),
        h("input", {
          name: "estimate",
          type: "number",
          min: "1",
          value: draft.estimate,
          onInput: (event) => onDraftChange("estimate", event.target.value),
        }),
      ),
      h(
        "label",
        { className: "field" },
        h("span", { className: "field-label" }, "우선순위"),
        h(
          "select",
          {
            name: "priority",
            value: draft.priority,
            onChange: (event) => onDraftChange("priority", event.target.value),
          },
          ...PRIORITY_OPTIONS.map((priority) =>
            h("option", { value: priority }, priorityLabel(priority)),
          ),
        ),
      ),
      h(
        "div",
        { className: "composer-footer span-2" },
        h(
        "button",
        { type: "submit", className: "button button-primary", "data-action": "add-task" },
        "작업 추가",
      ),
      ),
    ),
  );
}

function FilterBar({
  query,
  statusFilter,
  visibleCount,
  totalCount,
  visibleEstimate,
  onQueryChange,
  onFilterChange,
}) {
  return h(
    "section",
    { className: "panel-card" },
    h(
      "div",
      { className: "panel-head" },
      h("h2", {}, "필터 & 검색"),
      h(
        "p",
        { className: "muted", "data-role": "filter-summary" },
        `현재 ${visibleCount}/${totalCount}개 작업, ${visibleEstimate}h 표시 중`,
      ),
    ),
    h(
      "div",
      { className: "filter-grid" },
      h(
        "label",
        { className: "field span-2" },
        h("span", { className: "field-label" }, "검색"),
        h("input", {
          name: "query",
          value: query,
          placeholder: "제목 또는 담당자 검색",
          onInput: (event) => onQueryChange(event.target.value),
        }),
      ),
      h(
        "label",
        { className: "field" },
        h("span", { className: "field-label" }, "상태 필터"),
        h(
          "select",
          {
            name: "statusFilter",
            value: statusFilter,
            onChange: (event) => onFilterChange(event.target.value),
          },
          ...STATUS_OPTIONS.map((status) =>
            h("option", { value: status }, statusOptionLabel(status)),
          ),
        ),
      ),
    ),
  );
}

function TaskList({ tasks, onAdvanceTask }) {
  return h(
    "section",
    { className: "panel-card list-card" },
    h("div", { className: "panel-head" }, h("h2", {}, "작업 보드"), h("p", { className: "muted" }, "index 기반 diff로 필요한 카드만 갱신합니다.")),
    tasks.length === 0
      ? h(
          "div",
          { className: "empty-state", "data-role": "empty-state" },
          h("strong", {}, "조건에 맞는 작업이 없습니다."),
          h("p", {}, "검색어나 상태 필터를 조정해 보세요."),
        )
      : h(
          "ul",
          { className: "task-list", "data-role": "task-list" },
          ...tasks.map((task) => h(TaskItem, { task, onAdvanceTask })),
        ),
  );
}

function TaskItem({ task, onAdvanceTask }) {
  return h(
    "li",
    {
      className: `task-item status-${task.status}`,
      "data-task-id": task.id,
    },
    h(
      "div",
      { className: "task-meta" },
      h("span", { className: `badge priority-${task.priority}` }, priorityLabel(task.priority)),
      h("span", { className: `badge status-badge status-${task.status}` }, statusOptionLabel(task.status)),
      h("span", { className: "muted" }, `${task.owner} · ${task.estimate}h`),
    ),
    h("strong", { className: "task-title" }, task.title),
    h(
      "div",
      { className: "task-actions" },
      h(
        "button",
        {
          type: "button",
          className: "button button-small",
          "data-action": `advance-${task.id}`,
          onClick: () => onAdvanceTask(task.id),
        },
        statusActionLabel(task.status),
      ),
    ),
  );
}

function InsightPanel({ counts, completionRate, focusTask, totalEstimate, tasks }) {
  const ownerLoad = summarizeOwnerLoad(tasks);

  return h(
    "aside",
    { className: "panel-card insight-card", "data-role": "insight-panel" },
    h("div", { className: "panel-head" }, h("h2", {}, "인사이트"), h("p", { className: "muted" }, "useMemo로 계산한 파생 데이터를 발표 포인트로 정리했습니다.")),
    h(
      "div",
      { className: "insight-stack" },
      h(InsightRow, { label: "진행 중", value: `${counts.doing}개` }),
      h(InsightRow, { label: "완료", value: `${counts.done}개` }),
      h(InsightRow, { label: "완료율", value: `${completionRate}%` }),
      h(InsightRow, { label: "총 예상 시간", value: `${totalEstimate}h` }),
      h(
        "div",
        { className: "focus-card" },
        h("span", { className: "field-label" }, "최우선 집중 과제"),
        h("strong", {}, focusTask ? focusTask.title : "현재 남은 작업이 없습니다."),
        h("p", { className: "muted" }, focusTask ? `${focusTask.owner} · ${focusTask.estimate}h` : "다음 스프린트를 준비해 보세요."),
      ),
      h(
        "div",
        { className: "owner-load" },
        h("span", { className: "field-label" }, "담당자별 로드"),
        h(
          "ul",
          { className: "owner-list" },
          ...ownerLoad.map((entry) =>
            h(
              "li",
              {},
              h("span", {}, entry.owner),
              h("strong", {}, `${entry.hours}h`),
            ),
          ),
        ),
      ),
    ),
  );
}

function InsightRow({ label, value }) {
  return h(
    "div",
    { className: "insight-row" },
    h("span", { className: "muted" }, label),
    h("strong", {}, value),
  );
}

function createCounts(tasks) {
  return tasks.reduce(
    (summary, task) => {
      summary.total += 1;
      summary[task.status] += 1;
      return summary;
    },
    {
      total: 0,
      todo: 0,
      doing: 0,
      done: 0,
    },
  );
}

function findFocusTask(tasks) {
  const activeTasks = tasks.filter((task) => task.status !== "done");

  if (activeTasks.length === 0) {
    return null;
  }

  const priorityOrder = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...activeTasks].sort((left, right) => {
    if (priorityOrder[left.priority] !== priorityOrder[right.priority]) {
      return priorityOrder[left.priority] - priorityOrder[right.priority];
    }

    return left.estimate - right.estimate;
  })[0];
}

function summarizeOwnerLoad(tasks) {
  const ownerHours = new Map();

  for (const task of tasks) {
    ownerHours.set(task.owner, (ownerHours.get(task.owner) ?? 0) + task.estimate);
  }

  return [...ownerHours.entries()]
    .map(([owner, hours]) => ({ owner, hours }))
    .sort((left, right) => right.hours - left.hours);
}

function matchesTask(task, statusFilter, query) {
  const matchesStatus = statusFilter === "all" || task.status === statusFilter;
  const normalizedQuery = query.trim().toLowerCase();

  if (!matchesStatus) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  return [task.title, task.owner].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function nextStatus(status) {
  const index = TASK_STATUSES.indexOf(status);
  return TASK_STATUSES[(index + 1) % TASK_STATUSES.length];
}

function loadBoardState() {
  const fallback = {
    tasks: createSampleTasks(),
    statusFilter: "all",
    query: "",
    notice: "샘플 스프린트를 기반으로 Hook 동작을 살펴보세요.",
  };

  if (typeof localStorage === "undefined") {
    return fallback;
  }

  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      tasks: sanitizeTasks(parsedValue.tasks),
      statusFilter: STATUS_OPTIONS.includes(parsedValue.statusFilter)
        ? parsedValue.statusFilter
        : fallback.statusFilter,
      query: typeof parsedValue.query === "string" ? parsedValue.query : fallback.query,
      notice: typeof parsedValue.notice === "string" ? parsedValue.notice : fallback.notice,
    };
  } catch (_error) {
    return fallback;
  }
}

function sanitizeTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return createSampleTasks();
  }

  const safeTasks = tasks
    .map((task, index) => sanitizeTask(task, index))
    .filter((task) => task !== null);

  return safeTasks.length > 0 ? safeTasks : createSampleTasks();
}

function sanitizeTask(task, index) {
  if (!task || typeof task !== "object") {
    return null;
  }

  const title = typeof task.title === "string" ? task.title.trim() : "";
  const owner = typeof task.owner === "string" ? task.owner.trim() : "미정";
  const estimate = Number(task.estimate);

  if (!title || !TASK_STATUSES.includes(task.status) || !PRIORITY_OPTIONS.includes(task.priority)) {
    return null;
  }

  if (!Number.isFinite(estimate) || estimate <= 0) {
    return null;
  }

  return {
    id: typeof task.id === "string" && task.id ? task.id : `restored-${index}`,
    title,
    status: task.status,
    priority: task.priority,
    owner,
    estimate,
  };
}

function priorityLabel(priority) {
  return {
    high: "High",
    medium: "Medium",
    low: "Low",
  }[priority];
}

function statusOptionLabel(status) {
  return {
    all: "전체",
    todo: "Todo",
    doing: "Doing",
    done: "Done",
  }[status];
}

function statusActionLabel(status) {
  return {
    todo: "진행 시작",
    doing: "완료 처리",
    done: "다시 열기",
  }[status];
}
