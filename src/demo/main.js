import { FunctionComponent } from "../runtime/FunctionComponent.js";
import { CodingSprintBoardApp } from "./CodingSprintBoardApp.js";

export function mountCodingSprintBoard(container) {
  const app = new FunctionComponent(CodingSprintBoardApp, {}, container);
  app.mount();
  return app;
}

const root = typeof document !== "undefined" ? document.querySelector("[data-app-root]") : null;

if (root) {
  mountCodingSprintBoard(root);
}
