# React-like Runtime + Coding Sprint Board

> Status note
>
> 이 README는 현재 저장소에 들어 있는 `Coding Sprint Board` 기준 설명 문서입니다.
> 지금 진행 중인 병렬 개발 라운드의 최신 기준 문서는 아래 순서를 따릅니다.
>
> 1. `/Users/wiseungcheol/Desktop/W5_React/React/docs/START_HERE.md`
> 2. `/Users/wiseungcheol/Desktop/W5_React/React/docs/Parallel_Development_Guide.md`
> 3. `/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md`
> 4. 각 역할별 `/Users/wiseungcheol/Desktop/W5_React/React/docs/agents/*.md`
>
> 즉, 새 작업을 시작하는 에이전트는 이 README보다 위 문서들을 우선해야 합니다.

## 프로젝트 한 줄 소개

기존 Week 3 Virtual DOM 엔진(`diff`, `applyPatches`, `vdomToDom`)은 유지하고, 그 위에 **함수형 컴포넌트 + Hook 런타임**을 직접 구현해 동작하는 스프린트 보드를 만든 프로젝트입니다.

이번 결과물의 핵심은 단순한 TODO 앱이 아니라 아래 흐름을 실제 코드로 연결했다는 점입니다.

- `FunctionComponent`가 루트 컴포넌트를 실행한다.
- `useState`, `useEffect`, `useMemo`가 Hook 배열에 상태를 유지한다.
- 상태가 바뀌면 새 Virtual DOM을 만든다.
- 이전 Virtual DOM과 `diff`한다.
- 바뀐 부분만 `applyPatches`로 실제 DOM에 반영한다.

## 구현 목표

- 함수형 컴포넌트를 감싸는 `FunctionComponent` 클래스 직접 구현
- 루트 컴포넌트에서만 Hook 사용 가능하도록 제한
- 자식 컴포넌트는 props만 받는 stateless component로 유지
- `useState`, `useEffect`, `useMemo` 최소 구현
- index 기반 Diff/Patch 유지, `key`는 사용하지 않음
- 클릭/입력으로 화면이 실제로 바뀌는 데모 페이지 구현
- 단위 테스트 + 상호작용 테스트 + 빌드 검증까지 완료

## 데모 주제

최종 데모는 **Coding Sprint Board**입니다.

- 작업 추가
- 상태 전환(`todo -> doing -> done`)
- 검색 / 상태 필터
- 완료 작업 정리
- 샘플 스프린트 로드
- `localStorage` 복원
- `document.title` 동기화

이 화면 하나에서 Component, State, Hooks, Diff/Patch, Batching을 모두 설명할 수 있도록 구성했습니다.

## 아키텍처

### 1. 기존 엔진 유지

기존 구조는 그대로 살렸습니다.

- `src/lib/diff.js`
- `src/lib/applyPatches.js`
- `src/lib/vdomToDom.js`
- `src/lib/renderTo.js`

기존 `renderTo`는 최초 mount 시에 사용하고, 이후 상태 변경은 `FunctionComponent.update()`에서 `diff + applyPatches` 경로로 처리합니다.

### 2. 새 런타임 레이어

`src/runtime/`에 React-like 런타임을 추가했습니다.

- `FunctionComponent.js`
- `hooks.js`
- `createElement.js`
- `context.js`

핵심 역할은 다음과 같습니다.

- `hooks[]` 배열에 상태 / memo / effect 메타데이터 저장
- `hookIndex`로 Hook 호출 순서 관리
- `mount()`에서 첫 렌더 + effect 실행
- `update()`에서 이전 vDOM과 새 vDOM을 비교해 patch 적용
- 여러 `setState`를 같은 tick 안에서 한 번만 갱신하도록 microtask batching

### 3. Hook 제약

이번 구현은 과제 조건을 그대로 반영했습니다.

- Hook은 **루트 컴포넌트에서만** 사용 가능
- 자식 컴포넌트는 **상태 없는 순수 함수**
- 자식 컴포넌트에서 Hook을 호출하면 에러 발생

즉, 상태는 모두 최상위에서 관리하고 props로 내려보내는 **Lifting State Up** 패턴을 강제했습니다.

## Public API

`src/lib.js`에서 아래 API를 공개합니다.

- `FunctionComponent`
- `createElement`
- `useState`
- `useEffect`
- `useMemo`
- `diff`
- `applyPatches`
- `renderTo`
- `domToVdom`
- `vdomToDom`

## Hook 구현 요약

### useState

- Hook slot에 현재 값을 저장
- 값 또는 함수형 updater 모두 지원
- `Object.is` 기준으로 값이 같으면 update 생략
- 값이 바뀌면 microtask에 update 예약

### useEffect

- deps를 비교해 바뀐 경우만 실행
- commit 이후 effect 실행
- 재실행 전 이전 cleanup 먼저 호출
- 데모에서는 `localStorage` 저장과 `document.title` 동기화에 사용

### useMemo

- deps가 같으면 이전 계산값 재사용
- 데모에서는 아래 파생 데이터를 memoized
- 필터된 작업 목록
- 상태별 개수
- 완료율
- 최우선 집중 과제

## Batching

이번 구현에서는 선택 과제였던 batching도 포함했습니다.

- 같은 이벤트 루프 안에서 여러 `setState`가 호출되어도
- `queueMicrotask`로 update를 한 번만 예약
- 결과적으로 DOM patch도 한 번만 수행

데모에서 `샘플 스프린트 불러오기` 버튼이 이 동작을 보여줍니다.

- `setTasks(...)`
- `setStatusFilter("all")`
- `setQuery("")`
- `setNotice(...)`

이 네 개가 한 번의 update로 묶입니다.

## 실제 React와의 차이

이번 구현은 React의 핵심 아이디어를 축약한 버전이라, 실제 React와는 차이가 있습니다.

1. `key` 기반 reconciliation이 없습니다.  
   리스트는 index 기반으로만 비교합니다.

2. Fiber / concurrent rendering이 없습니다.  
   update는 동기적으로 한 번에 처리됩니다.

3. 자식 컴포넌트 Hook을 지원하지 않습니다.  
   이번 과제 조건에 맞춰 루트 Hook만 허용했습니다.

4. JSX / Babel / React Compiler가 없습니다.  
   `createElement()`를 직접 호출합니다.

5. effect scheduling이 단순합니다.  
   commit 이후 즉시 flush하며, 우선순위 스케줄링은 없습니다.

하지만 “함수는 매번 새로 실행되는데 상태는 어떻게 유지되는가?”라는 Hook의 본질은 직접 구현으로 확인할 수 있습니다.

## 실행 방법

```bash
npm ci
npm run dev
```

추가 검증:

```bash
npm test -- --run
npm run build
```

## 테스트 및 검증 결과

검증은 세 층으로 나눴습니다.

### 1. 기존 엔진 회귀 테스트

- `domToVdom`
- `vdomToDom`
- `diff`
- `applyPatches`
- `renderTo`
- `history`
- edge case

기존 구현을 깨지 않았는지 먼저 확인했습니다.

### 2. 런타임 테스트

- 첫 mount
- patch 기반 update
- Hook 순서에 따른 상태 유지
- 함수형 `setState`
- batching 1회 update
- `useEffect` deps / cleanup
- `useMemo` 캐시
- 자식 컴포넌트 Hook 금지
- 이벤트 prop mount / update / remove

### 3. 데모 상호작용 테스트

- `localStorage` 복원
- `document.title` 동기화
- 폼으로 작업 추가
- 검색 / 필터 동작
- 상태 전환
- 완료 작업 정리
- 샘플 스프린트 재로드

최종 결과:

- 테스트 파일: **10개 통과**
- 테스트 케이스: **58개 통과**
- `vite build` 성공

## 발표 흐름 제안

목요일 발표에서는 아래 순서로 설명하면 흐름이 자연스럽습니다.

1. 왜 이 프로젝트를 만들었는가  
   기존 VDOM 엔진 위에 React 핵심 기능을 직접 올려보는 것이 목표

2. 상태를 어디에 두었는가  
   루트 컴포넌트만 상태를 가지고 자식은 props만 사용

3. Hook이 어떻게 상태를 유지하는가  
   `hooks[]`와 `hookIndex`로 호출 순서를 기반으로 상태 유지

4. 상태가 바뀌면 화면이 어떻게 갱신되는가  
   새 vDOM 생성 -> `diff` -> `applyPatches`

5. batching은 어떻게 처리했는가  
   같은 tick의 여러 `setState`를 microtask 하나로 묶음

6. 무엇을 테스트했는가  
   런타임, 엔진, 데모 상호작용까지 회귀 테스트로 검증

## 폴더 구조

```text
src/
  demo/
    CodingSprintBoardApp.js
    data.js
    main.js
  runtime/
    FunctionComponent.js
    context.js
    createElement.js
    hooks.js
  lib/
    diff.js
    applyPatches.js
    domProps.js
    domToVdom.js
    renderTo.js
    vdomToDom.js
tests/
  demo/
  runtime/
  lib/
```

## 마무리

이번 프로젝트는 “React를 사용해서 만든 앱”이 아니라, **React의 핵심 개념을 직접 구현한 뒤 그 위에서 실제로 쓸 수 있는 화면까지 만든 앱**입니다.

결과물 자체도 중요하지만, 더 중요한 포인트는 다음 질문에 답할 수 있게 되었다는 점입니다.

- Hook은 왜 순서가 중요할까?
- 상태는 왜 루트에서 관리하면 단순해질까?
- `setState`는 값 변경 외에 무엇을 해야 할까?
- 왜 전체 렌더가 아니라 diff/patch가 필요한가?

이 질문들을 코드와 테스트로 설명할 수 있는 수준까지 정리한 것이 이번 결과물의 핵심입니다.
