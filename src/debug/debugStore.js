import {
  createEmptyDebugSnapshot,
  normalizeDebugSnapshot,
} from "./debugSnapshot.js";

export function createDebugStore(debugTarget) {
  return {
    getSnapshot() {
      return readDebugSnapshot(debugTarget);
    },
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("listener must be a function.");
      }

      if (!hasDebugSubscription(debugTarget)) {
        return () => {};
      }

      const unsubscribe = debugTarget.subscribeDebug(() => {
        listener(readDebugSnapshot(debugTarget));
      });

      return typeof unsubscribe === "function" ? unsubscribe : () => {};
    },
  };
}

export function createMockDebugSource(initialSnapshot = createEmptyDebugSnapshot()) {
  let currentSnapshot = normalizeDebugSnapshot(initialSnapshot);
  const listeners = new Set();

  function emit() {
    const snapshot = readDebugSnapshot(source);

    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  const source = {
    getDebugSnapshot() {
      return normalizeDebugSnapshot(currentSnapshot);
    },
    subscribeDebug(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("listener must be a function.");
      }

      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSnapshot(nextSnapshot) {
      currentSnapshot = normalizeDebugSnapshot(nextSnapshot);
      emit();
      return source.getDebugSnapshot();
    },
    patchSnapshot(partialSnapshot) {
      currentSnapshot = normalizeDebugSnapshot({
        ...currentSnapshot,
        ...partialSnapshot,
      });
      emit();
      return source.getDebugSnapshot();
    },
  };

  return source;
}

export function readDebugSnapshot(debugTarget) {
  if (!hasDebugReader(debugTarget)) {
    return createEmptyDebugSnapshot();
  }

  return normalizeDebugSnapshot(debugTarget.getDebugSnapshot());
}

function hasDebugReader(debugTarget) {
  return Boolean(debugTarget) && typeof debugTarget.getDebugSnapshot === "function";
}

function hasDebugSubscription(debugTarget) {
  return Boolean(debugTarget) && typeof debugTarget.subscribeDebug === "function";
}
