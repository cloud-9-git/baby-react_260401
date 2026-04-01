import { createElement } from "../../../lib.js";

const h = createElement;

export function RenderTracePanel({ items }) {
  return h(
    "section",
    {
      className: "panel-card debug-card",
      "data-role": "render-trace-panel",
    },
    h("div", { className: "debug-card-head" }, h("h2", {}, "렌더 추적 패널")),
    renderList(items, "아직 렌더 추적이 없습니다", "render-trace-list"),
  );
}

function renderList(items, emptyText, role) {
  if (!Array.isArray(items) || items.length === 0) {
    return h("p", { className: "debug-empty" }, emptyText);
  }

  return h(
    "ol",
    { className: "debug-log-list", "data-role": role },
    ...items.map((item) =>
      h(
        "li",
        { className: "debug-log-item" },
        h("span", { className: "debug-log-label" }, item.label),
      ),
    ),
  );
}
