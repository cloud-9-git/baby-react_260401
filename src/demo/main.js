import { FunctionComponent } from "../runtime/FunctionComponent.js";
import { DebugPanelApp } from "./panel/DebugPanelApp.js";
import { CodingSprintBoardApp } from "./CodingSprintBoardApp.js";

export function mountCodingSprintBoard(container) {
  const app = new FunctionComponent(CodingSprintBoardApp, {}, container);
  app.mount();
  return app;
}

export function mountDebugPanel(container, debugTarget) {
  const panel = new FunctionComponent(DebugPanelApp, { debugTarget }, container);
  panel.mount();
  return panel;
}

export function mountDemoPage(appContainer, debugContainer) {
  const app = mountCodingSprintBoard(appContainer);
  const debugPanel = debugContainer ? mountDebugPanel(debugContainer, app) : null;

  return {
    app,
    debugPanel,
  };
}

const appRoot = typeof document !== "undefined" ? document.querySelector("[data-app-root]") : null;
const debugRoot = typeof document !== "undefined" ? document.querySelector("[data-debug-root]") : null;

if (appRoot) {
  mountDemoPage(appRoot, debugRoot);
}
