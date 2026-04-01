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

function readSnapshot(debugTarget) {
  const store = createDebugStore(debugTarget);
  return store.getSnapshot() ?? createEmptyDebugSnapshot();
}
