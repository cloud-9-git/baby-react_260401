import { FunctionComponent } from "../runtime/FunctionComponent.js";
import { EmojiReactionBoardApp } from "./app/EmojiReactionBoardApp.js";

export function mountEmojiReactionBoard(container) {
  const app = new FunctionComponent(EmojiReactionBoardApp, {}, container);
  app.mount();
  return app;
}

export function mountCodingSprintBoard(container) {
  return mountEmojiReactionBoard(container);
}

const root = typeof document !== "undefined" ? document.querySelector("[data-app-root]") : null;

if (root) {
  mountEmojiReactionBoard(root);
}
