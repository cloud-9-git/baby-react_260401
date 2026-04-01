import { createElement, useEffect, useState } from "../../lib.js";
import { createDebugStore } from "../../debug/debugStore.js";
import {
  createEmptyDebugSnapshot,
  formatDebugPanelModel,
} from "../../debug/debugSnapshot.js";
import { ActionLogPanel } from "./components/ActionLogPanel.js";
import { PatchSummaryPanel } from "./components/PatchSummaryPanel.js";
import { RenderTracePanel } from "./components/RenderTracePanel.js";

const h = createElement;
const DEBUG_TABS = [
  { id: "action", label: "액션 로그" },
  { id: "render", label: "렌더 추적" },
  { id: "patch", label: "패치 요약" },
];

export function DebugPanelApp({ debugTarget }) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(debugTarget));
  const [activeTab, setActiveTab] = useState("action");

  useEffect(() => {
    const store = createDebugStore(debugTarget);
    setSnapshot(store.getSnapshot());

    return store.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
  }, [debugTarget]);

  const model = formatDebugPanelModel(snapshot);

  return h(
    "aside",
    {
      className: "debug-panel-shell",
      "data-role": "debug-panel",
    },
    h(
      "header",
      {
        className: "panel-card debug-panel-hero",
      },
      h("p", { className: "eyebrow" }, "런타임 디버그 패널"),
      h("h1", { className: "debug-title" }, "렌더와 패치 활동"),
      h(
        "p",
        { className: "muted debug-subtitle" },
        "공개 debug snapshot API를 구독해 최신 액션, 렌더 추적, 패치 요약을 확인합니다.",
      ),
      h(
        "div",
        { className: "debug-metrics", "data-role": "debug-metrics" },
        h(DebugMetricCard, {
          label: "렌더 횟수",
          value: String(model.renderCount),
        }),
        h(DebugMetricCard, {
          label: "마운트 여부",
          value: model.isMounted ? "예" : "아니오",
        }),
        h(DebugMetricCard, {
          label: "업데이트 예약",
          value: model.isUpdateScheduled ? "예" : "아니오",
        }),
      ),
      h(
        "div",
        { className: "debug-tab-list", role: "tablist", "aria-label": "디버그 패널 섹션" },
        ...DEBUG_TABS.map((tab) =>
          h(
            "button",
            {
              key: tab.id,
              type: "button",
              className: createTabClassName(activeTab === tab.id),
              role: "tab",
              "aria-selected": activeTab === tab.id ? "true" : "false",
              "data-tab": tab.id,
              "data-active": activeTab === tab.id ? "true" : "false",
              onClick: () => setActiveTab(tab.id),
            },
            tab.label,
          )),
      ),
    ),
    h(
      "div",
      { className: "debug-tab-panels" },
      h(
        "div",
        { hidden: activeTab !== "action", "data-role": "debug-tab-panel-action" },
        h(ActionLogPanel, {
          actionText: model.actionText,
          payloadText: model.actionPayloadText,
        }),
      ),
      h(
        "div",
        { hidden: activeTab !== "render", "data-role": "debug-tab-panel-render" },
        h(RenderTracePanel, { items: model.renderTraceItems }),
      ),
      h(
        "div",
        { hidden: activeTab !== "patch", "data-role": "debug-tab-panel-patch" },
        h(PatchSummaryPanel, { items: model.patchItems }),
      ),
    ),
    h(NodeActionCard, { snapshot }),
  );
}

function DebugMetricCard({ label, value }) {
  return h(
    "article",
    { className: "summary-card tone-sky debug-metric-card" },
    h("span", { className: "summary-label" }, label),
    h("strong", { className: "summary-value" }, value),
  );
}

function createTabClassName(isActive) {
  return `debug-tab-button${isActive ? " is-active" : ""}`;
}

function NodeActionCard({ snapshot }) {
  return h(
    "section",
    {
      className: "panel-card debug-card",
      "data-role": "node-action-card",
    },
    h("div", { className: "debug-card-head" }, h("h2", {}, "마지막 런타임 노드 로그")),
    h(
      "div",
      {
        className: "debug-sidebar-console",
        "data-role": "last-node-action",
      },
      h("pre", {}, formatRuntimeNodeLog(snapshot)),
    ),
  );
}

function readSnapshot(debugTarget) {
  const store = createDebugStore(debugTarget);
  return store.getSnapshot() ?? createEmptyDebugSnapshot();
}

function formatRuntimeNodeLog(snapshot) {
  const firstPatch = Array.isArray(snapshot?.lastPatches) ? snapshot.lastPatches[0] : null;
  const action = snapshot?.lastAction ?? null;

  if (!firstPatch) {
    return JSON.stringify({ 상태: "아직 기록된 런타임 노드 패치가 없어요" }, null, 2);
  }

  return JSON.stringify(
    {
      액션: action ? localizeActionType(action.type) : "없음",
      원본액션: action?.type ?? "없음",
      패치유형: firstPatch.type,
      대상경로: `[${Array.isArray(firstPatch.path) ? firstPatch.path.join(",") : ""}]`,
      런타임노드종류: firstPatch.targetNodeType ?? inferNodeTypeFromPatch(firstPatch.type),
      태그: firstPatch.targetTag ?? "",
      요약: firstPatch.summary ?? "",
      전체패치수: Array.isArray(snapshot?.lastPatches) ? snapshot.lastPatches.length : 0,
    },
    null,
    2,
  );
}

function inferNodeTypeFromPatch(type) {
  switch (type) {
    case "TEXT":
      return "TEXT_NODE";
    case "PROPS":
      return "ELEMENT_NODE";
    default:
      return "알 수 없음";
  }
}

function localizeActionType(type) {
  switch (type) {
    case "react":
      return "반응";
    case "save":
      return "저장";
    case "restore":
      return "복원";
    case "reset":
      return "초기화";
    case "click":
      return "클릭";
    case "input":
      return "입력";
    case "change":
      return "변경";
    case "submit":
      return "제출";
    default:
      return type ?? "";
  }
}
