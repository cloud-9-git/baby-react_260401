import { FunctionComponent } from "../runtime/FunctionComponent.js";
import { EmojiReactionBoardApp } from "./app/EmojiReactionBoardApp.js";
import { DebugPanelApp } from "./panel/DebugPanelApp.js";

export function mountEmojiReactionBoard(container) {
  const app = new FunctionComponent(EmojiReactionBoardApp, {}, container);
  app.mount();
  return app;
}

export function mountCodingSprintBoard(container) {
  return mountEmojiReactionBoard(container);
}

export function mountDebugPanel(container, debugTarget) {
  const panel = new FunctionComponent(DebugPanelApp, { debugTarget }, container);
  panel.mount();
  return panel;
}

export function mountDemoPage(appContainer, debugContainer) {
  const app = mountEmojiReactionBoard(appContainer);
  const resolvedDebugContainer = debugContainer ?? appContainer.querySelector("[data-panel-root]");
  const debugPanel = resolvedDebugContainer ? mountDebugPanel(resolvedDebugContainer, app) : null;

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
