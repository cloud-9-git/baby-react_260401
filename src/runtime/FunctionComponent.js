import { applyPatches } from "../lib/applyPatches.js";
import { withDebugOwner } from "../lib/domProps.js";
import { diff } from "../lib/diff.js";
import { renderTo } from "../lib/renderTo.js";
import {
  createEmptyDebugSnapshot,
  normalizeDebugAction,
  normalizeDebugSnapshot,
  summarizePatches,
} from "../debug/debugSnapshot.js";
import { withRenderContext } from "./context.js";
import { normalizeComponentResult } from "./createElement.js";
import { resolveVNodeTree } from "./resolveVNodeTree.js";

export class FunctionComponent {
  constructor(renderFn, props, container) {
    if (typeof renderFn !== "function") {
      throw new TypeError("renderFn must be a function.");
    }

    if (!container || typeof container.replaceChildren !== "function") {
      throw new TypeError("container must be a DOM element.");
    }

    this.renderFn = renderFn;
    this.props = props ?? {};
    this.container = container;

    this.hooks = [];
    this.hookIndex = 0;

    this.currentVdom = null;
    this.currentRootDom = null;

    this.pendingEffects = [];
    this.isMounted = false;
    this.isUpdateScheduled = false;

    this.debugListeners = new Set();
    this.debugSnapshot = createEmptyDebugSnapshot();
    this.pendingStateReasons = [];
    this.currentRenderTrace = [];
    this.currentHookUsage = null;
  }

  mount() {
    const nextVdom = this.renderComponent(this.consumeRenderReason("mount"));

    this.debugSnapshot.renderCount += 1;
    this.currentVdom = nextVdom;

    withDebugOwner(this, () => {
      renderTo(this.container, nextVdom);
    });

    this.currentRootDom = this.container.firstChild ?? null;
    this.isMounted = true;
    this.flushEffects();
    this.commitDebugSnapshot({
      lastPatches: [],
      renderTrace: this.currentRenderTrace,
    });

    return this.currentRootDom;
  }

  update(reason = "update") {
    if (!this.isMounted) {
      return this.mount();
    }

    const previousVdom = this.currentVdom;
    const nextVdom = this.renderComponent(
      reason === "update" ? this.consumeRenderReason("update") : reason,
    );

    this.debugSnapshot.renderCount += 1;
    this.currentVdom = nextVdom;

    if (!this.currentRootDom) {
      withDebugOwner(this, () => {
        renderTo(this.container, nextVdom);
      });

      this.currentRootDom = this.container.firstChild ?? null;
      this.flushEffects();
      this.commitDebugSnapshot({
        lastPatches: [],
        renderTrace: this.currentRenderTrace,
      });
      return this.currentRootDom;
    }

    const patches = diff(previousVdom, nextVdom);

    if (patches.length > 0) {
      const nextRootDom = withDebugOwner(this, () => applyPatches(this.currentRootDom, patches));

      if (nextRootDom === null) {
        withDebugOwner(this, () => {
          renderTo(this.container, nextVdom);
        });
        this.currentRootDom = this.container.firstChild ?? null;
      } else {
        this.currentRootDom = nextRootDom;
      }
    }

    this.flushEffects();
    this.commitDebugSnapshot({
      lastPatches: summarizePatches(patches),
      renderTrace: this.currentRenderTrace,
    });
    return this.currentRootDom;
  }

  consumeHookIndex() {
    const currentIndex = this.hookIndex;
    this.hookIndex += 1;
    return currentIndex;
  }

  queueEffect(index, effect) {
    this.pendingEffects.push({ index, effect });
  }

  scheduleUpdate(reason = "update") {
    if (this.isUpdateScheduled) {
      return;
    }

    if (reason !== "update") {
      this.pendingStateReasons.push(reason);
    }

    this.isUpdateScheduled = true;
    this.commitDebugSnapshot();

    queueMicrotask(() => {
      this.isUpdateScheduled = false;
      this.update(this.consumeRenderReason("update"));
    });
  }

  renderComponent(reason = "render") {
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.currentHookUsage = createEmptyHookUsage();
    this.currentRenderTrace = [
      {
        name: getComponentName(this.renderFn),
        reason,
      },
    ];

    const unresolvedVdom = withRenderContext(this, "root", () =>
      normalizeComponentResult(this.renderFn(this.props)),
    );

    if (this.currentRenderTrace[0]) {
      const hookUsage = normalizeHookUsage(this.currentHookUsage);

      if (Object.keys(hookUsage).length > 0) {
        this.currentRenderTrace[0].hookUsage = hookUsage;
      }
    }

    return resolveVNodeTree(unresolvedVdom, this);
  }

  flushEffects() {
    const effectsToRun = this.pendingEffects;
    this.pendingEffects = [];

    for (const { index, effect } of effectsToRun) {
      const hook = this.hooks[index];

      if (!hook || hook.kind !== "effect") {
        continue;
      }

      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      const cleanup = effect();
      hook.cleanup = typeof cleanup === "function" ? cleanup : null;
    }
  }

  getDebugSnapshot() {
    return normalizeDebugSnapshot({
      ...this.debugSnapshot,
      renderCount: this.debugSnapshot.renderCount,
      isMounted: this.isMounted,
      isUpdateScheduled: this.isUpdateScheduled,
    });
  }

  subscribeDebug(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function.");
    }

    this.debugListeners.add(listener);
    return () => {
      this.debugListeners.delete(listener);
    };
  }

  recordAction(action) {
    return this.recordDebugAction(action);
  }

  recordDebugAction(action) {
    this.debugSnapshot.lastAction = normalizeDebugAction(action);
    this.emitDebugSnapshot();
    return this.debugSnapshot.lastAction;
  }

  recordRenderTrace(component, props = {}) {
    const rootReason = this.currentRenderTrace[0]?.reason ?? (this.isMounted ? "update" : "mount");

    this.currentRenderTrace.push({
      name: getComponentName(component),
      reason: rootReason,
      ...(props.key != null && String(props.key).trim() !== "" ? { key: String(props.key).trim() } : {}),
    });
  }

  recordStateUpdate(index) {
    this.pendingStateReasons.push(`state[${index}] updated`);
  }

  recordHookUsage(hookName) {
    if (!this.currentHookUsage || typeof hookName !== "string" || hookName.trim() === "") {
      return;
    }

    const normalizedName = hookName.trim();
    this.currentHookUsage[normalizedName] = (this.currentHookUsage[normalizedName] ?? 0) + 1;
  }

  commitDebugSnapshot(partialSnapshot = {}) {
    this.debugSnapshot = normalizeDebugSnapshot({
      ...this.debugSnapshot,
      ...partialSnapshot,
      renderCount: this.debugSnapshot.renderCount,
      isMounted: this.isMounted,
      isUpdateScheduled: this.isUpdateScheduled,
    });
    this.emitDebugSnapshot();
    return this.debugSnapshot;
  }

  consumeRenderReason(fallbackReason) {
    if (this.pendingStateReasons.length === 0) {
      return fallbackReason;
    }

    const reason = [...new Set(this.pendingStateReasons)].join(", ");
    this.pendingStateReasons = [];
    return reason;
  }

  emitDebugSnapshot() {
    const snapshot = this.getDebugSnapshot();

    for (const listener of this.debugListeners) {
      listener(snapshot);
    }
  }
}

function getComponentName(component) {
  if (typeof component === "function" && component.name) {
    return component.name;
  }

  return "Anonymous";
}

function createEmptyHookUsage() {
  return {
    useState: 0,
    useEffect: 0,
    useMemo: 0,
    useDebugControls: 0,
  };
}

function normalizeHookUsage(hookUsage) {
  if (!hookUsage || typeof hookUsage !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(hookUsage).filter(([, count]) => Number.isInteger(count) && count > 0),
  );
}
