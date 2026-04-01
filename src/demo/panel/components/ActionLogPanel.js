import { createElement } from "../../../lib.js";

const h = createElement;

export function ActionLogPanel({ actionText, payloadText }) {
  return h(
    "section",
    {
      className: "panel-card debug-card",
      "data-role": "action-log-panel",
    },
    h("div", { className: "debug-card-head" }, h("h2", {}, "마지막 액션 로그")),
    h("p", { className: "debug-emphasis", "data-role": "last-action" }, actionText),
    h("p", { className: "debug-meta" }, payloadText),
  );
}
