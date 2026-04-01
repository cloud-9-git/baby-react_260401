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

export function DebugPanelApp({ debugTarget }) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(debugTarget));

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
      h("p", { className: "eyebrow" }, "Runtime Debug Panel"),
      h("h1", { className: "debug-title" }, "Render and patch activity"),
      h(
        "p",
        { className: "muted" },
        "공개 debug snapshot API만 구독해서 마지막 액션, 렌더 흐름, patch 요약을 보여줍니다.",
      ),
      h(
        "div",
        { className: "debug-metrics", "data-role": "debug-metrics" },
        h(DebugMetricCard, {
          label: "Render Count",
          value: String(model.renderCount),
        }),
        h(DebugMetricCard, {
          label: "Mounted",
          value: model.isMounted ? "yes" : "no",
        }),
        h(DebugMetricCard, {
          label: "Update Scheduled",
          value: model.isUpdateScheduled ? "yes" : "no",
        }),
      ),
    ),
    h(ActionLogPanel, {
      actionText: model.actionText,
      payloadText: model.actionPayloadText,
    }),
    h(RenderTracePanel, { items: model.renderTraceItems }),
    h(PatchSummaryPanel, { items: model.patchItems }),
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

function readSnapshot(debugTarget) {
  const store = createDebugStore(debugTarget);
  return store.getSnapshot() ?? createEmptyDebugSnapshot();
}
