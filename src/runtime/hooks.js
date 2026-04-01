// 구분	    함수	              역할
// 공개 훅	  useState	      상태 관리
// 공개 훅	  useEffect	      사이드 이펙트 처리
// 공개 훅	  useMemo	        값 메모이제이션 (캐싱)
// 내부 유틸	getRootInstance	현재 루트 인스턴스 가져오기
// 내부 유틸	resolveInitialValue	초기값 해석
// 내부 유틸	assertHookKind	훅 종류 검증
// 내부 유틸	normalizeDeps / areHookDepsEqual	의존성 배열 처리

import { getCurrentInstance, isRootRender } from "./context.js";

export function useState(initialValue) {
  const instance = getRootInstance();
  instance.recordHookUsage?.("useState");
  const index = instance.consumeHookIndex();
  const existingHook = instance.hooks[index];

  if (!existingHook) {
    const hook = {
      kind: "state",
      value: resolveInitialValue(initialValue),
      setState(nextValue) {
        const previousValue = hook.value;
        const resolvedValue =
          typeof nextValue === "function" ? nextValue(previousValue) : nextValue;

        if (Object.is(previousValue, resolvedValue)) {
          return previousValue;
        }

        hook.value = resolvedValue;

        if (typeof instance.recordStateUpdate === "function") {
          instance.recordStateUpdate(index, previousValue, resolvedValue);
        }

        instance.scheduleUpdate();
        return hook.value;
      },
    };

    instance.hooks[index] = hook;
    return [hook.value, hook.setState];
  }

  assertHookKind(existingHook, "state");
  return [existingHook.value, existingHook.setState];
}

export function useEffect(effect, deps) {
  if (typeof effect !== "function") {
    throw new TypeError("Effect callback must be a function.");
  }

  const instance = getRootInstance();
  instance.recordHookUsage?.("useEffect");
  const index = instance.consumeHookIndex();
  const existingHook = instance.hooks[index];

  if (existingHook) {
    assertHookKind(existingHook, "effect");
  }

  const hasChanged = !existingHook || !areHookDepsEqual(existingHook.deps, deps);

  instance.hooks[index] = {
    kind: "effect",
    deps: normalizeDeps(deps),
    cleanup: existingHook?.cleanup ?? null,
  };

  if (hasChanged) {
    instance.queueEffect(index, effect);
  }
}

export function useMemo(factory, deps) {
  if (typeof factory !== "function") {
    throw new TypeError("Memo factory must be a function.");
  }

  const instance = getRootInstance();
  instance.recordHookUsage?.("useMemo");
  const index = instance.consumeHookIndex();
  const existingHook = instance.hooks[index];

  if (existingHook) {
    assertHookKind(existingHook, "memo");

    if (areHookDepsEqual(existingHook.deps, deps)) {
      return existingHook.value;
    }
  }

  const value = factory();

  instance.hooks[index] = {
    kind: "memo",
    deps: normalizeDeps(deps),
    value,
  };

  return value;
}

export function useDebugControls() {
  const instance = getRootInstance();
  instance.recordHookUsage?.("useDebugControls");

  return {
    recordAction: instance.recordAction.bind(instance),
  };
}

function getRootInstance() {
  if (!isRootRender()) {
    throw new Error("Hooks can only be used in the root component.");
  }

  return getCurrentInstance();
}

function resolveInitialValue(initialValue) {
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

function assertHookKind(hook, expectedKind) {
  if (hook.kind !== expectedKind) {
    throw new Error("Hook order changed between renders.");
  }
}

function normalizeDeps(deps) {
  if (deps === undefined) {
    return undefined;
  }

  if (!Array.isArray(deps)) {
    throw new TypeError("Hook dependencies must be an array.");
  }

  return [...deps];
}

function areHookDepsEqual(previousDeps, nextDeps) {
  if (previousDeps === undefined || nextDeps === undefined) {
    return false;
  }

  if (previousDeps.length !== nextDeps.length) {
    return false;
  }

  for (let index = 0; index < previousDeps.length; index += 1) {
    if (!Object.is(previousDeps[index], nextDeps[index])) {
      return false;
    }
  }

  return true;
}
