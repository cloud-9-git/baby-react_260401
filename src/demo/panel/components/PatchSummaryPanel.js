import { createElement } from "../../../lib.js";

const h = createElement;

export function PatchSummaryPanel({ items }) {
  return h(
    "section",
    {
      className: "panel-card debug-card",
      "data-role": "patch-summary-panel",
    },
    h("div", { className: "debug-card-head" }, h("h2", {}, "Patch Summary Panel")),
    renderList(items, "No patches recorded", "patch-summary-list"),
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
