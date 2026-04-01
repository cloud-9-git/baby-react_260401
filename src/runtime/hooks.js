// 구분	    함수	              역할
// 공개 훅	  useState	      상태 관리
// 공개 훅	  useEffect	      사이드 이펙트 처리
// 공개 훅	  useMemo	        값 메모이제이션 (캐싱)
// 내부 유틸	getRootInstance	현재 루트 인스턴스 가져오기
// 내부 유틸	resolveInitialValue	초기값 해석
// 내부 유틸	assertHookKind	훅 종류 검증
// 내부 유틸	normalizeDeps / areHookDepsEqual	의존성 배열 처리

// instance 객체에는 훅(데이터 배열), 함수들이 들어있다
// 훅은 항상 같은 순서로 호출: State - effect - usememo 호출 순서로 식별되기 때문에


import { getCurrentInstance, isRootRender } from "./context.js";
// useState — 훅 객체를 만들고 상태를 기억하고(hook 배열에), 바꾸면 다시 그린다
// existingHook 여부에 따라 첫 렌더링과 재렌더링이 나뉨
export function useState(initialValue) {
  const instance = getRootInstance();
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
// 렌더링 후 사이드 이펙트 실행
// deps가 이전과 달라졌는지 검사 - 달라졌으면 이펙트객체(종류, 뎁스, 클린업) (예: 웹소켓 연결)를 큐에 넣음 - 안 달라졌으면 아무것도 안함
// deps undefined 매 렌더링마다 실행, 빈배열이면 첫 렌더링, 값이 있으면 값이 바뀔 때만(userId가 바뀔 때만)
export function useEffect(effect, deps) {
  if (typeof effect !== "function") {
    throw new TypeError("Effect callback must be a function.");
  }

  const instance = getRootInstance();
  const index = instance.consumeHookIndex();
  const existingHook = instance.hooks[index];

  if (existingHook) {
    assertHookKind(existingHook, "effect");
  }

  const hasChanged = !existingHook || !areHookDepsEqual(existingHook.deps, deps);

  instance.hooks[index] = {
    kind: "effect",
    deps: normalizeDeps(deps),
    // cleanup 함수
    cleanup: existingHook?.cleanup ?? null,
  };
// 큐에 넣기
  if (hasChanged) {
    instance.queueEffect(index, effect);
  }
}

// 비싼 계산 결과를 캐싱해두고, deps가 바뀔 때만 다시 계산
// factory: 값을 계산하는 함수, deps: 재계산 여부를 결정하는 의존성 배열
export function useMemo(factory, deps) {
  if (typeof factory !== "function") {
    throw new TypeError("Memo factory must be a function.");
  }

  const instance = getRootInstance();
  const index = instance.consumeHookIndex();
  const existingHook = instance.hooks[index];

  // 이전 훅이 있고 deps가 같으면 → 캐싱된 값 그대로 반환 (factory 실행 안 함)
  if (existingHook) {
    assertHookKind(existingHook, "memo");

    if (areHookDepsEqual(existingHook.deps, deps)) {
      return existingHook.value;
    }
  }

  // 첫 렌더링이거나 deps가 바뀌었으면 → factory 실행해서 새 값 계산 후 저장
  const value = factory();

  instance.hooks[index] = {
    kind: "memo",
    deps: normalizeDeps(deps),
    value,
  };

  return value;
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

// ──── deps(의존성 배열) 처리 ────
//
// deps는 "이 값들 중 하나라도 바뀌면 다시 실행/재계산해줘"라는 감시 목록(배열).
// 배열 안에는 useState로 만든 상태값, 또는 그로부터 파생된 값이 들어간다.
// useEffect와 useMemo 모두 같은 deps 구조를 사용하며, 차이는 deps가 바뀌었을 때의 행동뿐이다.
//   - useEffect: deps 바뀜 → 이펙트를 큐에 넣어서 렌더링 "이후에" 실행
//   - useMemo:   deps 바뀜 → factory를 "즉시" 실행해서 새 값 계산
//
// deps 패턴 3가지:
//   deps 생략(undefined) → 매 렌더링마다 실행
//   deps = []            → 첫 렌더링에만 실행 (마운트)
//   deps = [a, b]        → a 또는 b가 바뀔 때만 실행
//
// ── 우리 데모 페이지(CodingSprintBoardApp.js)에서 실제로 일어나는 일 ──
//
// 상태 5개가 useState로 만들어져 있다:
//   tasks, draft, statusFilter, query, notice
//
// [useEffect 예시 1] 사용자가 작업을 추가하면?
//   setTasks() 호출 → tasks 값 변경 → 리렌더링 발생
//   → useEffect의 deps [tasks, statusFilter, query, notice] 중 tasks가 바뀜
//   → 렌더링 끝난 뒤 localStorage.setItem() 실행 → 브라우저에 데이터 자동 저장
//   → 페이지 새로고침해도 작업 목록이 살아있음
//
// [useEffect 예시 2] 작업을 완료 처리하면?
//   tasks 배열이 바뀜 → counts.todo 값도 바뀜
//   → useEffect의 deps [counts.todo]가 바뀜
//   → 렌더링 끝난 뒤 document.title 업데이트
//   → 브라우저 탭에 "남은 할 일 3개" 같은 제목이 실시간 반영됨
//
// [useMemo 예시] 검색창에 글자를 타이핑하면?
//   setQuery() 호출 → query 값 변경 → 리렌더링 발생
//   → useMemo의 deps [tasks, statusFilter, query] 중 query가 바뀜
//   → tasks.filter(matchesTask) 즉시 재실행 → 필터링된 결과 반환
//   → 하지만 tasks나 statusFilter만 바뀌지 않으면? 이전 필터링 결과 재사용 (불필요한 계산 스킵)
//
// ── 실제 웹사이트에서는? ──
//
// 같은 원리가 훨씬 큰 규모로 쓰인다:
//   useEffect(() => { websocket.connect(roomId) }, [roomId])
//     → 채팅방 ID가 바뀔 때만 웹소켓 재연결 (카카오톡, 슬랙)
//   useEffect(() => { fetch(`/api/products?page=${page}`) }, [page])
//     → 페이지 번호가 바뀔 때만 상품 목록 서버 요청 (쿠팡, 네이버 쇼핑)
//   useMemo(() => posts.filter(p => p.category === selected), [posts, selected])
//     → 선택한 카테고리가 바뀔 때만 게시물 필터링 (블로그, 게시판)
//
// normalizeDeps: 외부에서 배열을 변경해도 내부 비교에 영향 없도록 얕은 복사
function normalizeDeps(deps) {
  if (deps === undefined) {
    return undefined;
  }

  if (!Array.isArray(deps)) {
    throw new TypeError("Hook dependencies must be an array.");
  }

  return [...deps];
}

// areHookDepsEqual: 이전 deps와 새 deps를 원소별로 Object.is()로 비교
// 하나라도 다르면 false → 이펙트 재실행 or 메모 재계산
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
