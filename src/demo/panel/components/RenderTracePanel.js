import { createElement } from "../../../lib.js";

const h = createElement;

export function RenderTracePanel({ items }) {
  return h(
    "section",
    {
      className: "panel-card debug-card",
      "data-role": "render-trace-panel",
    },
    h("div", { className: "debug-card-head" }, h("h2", {}, "Render Trace Panel")),
    renderList(items, "No render trace yet", "render-trace-list"),
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
