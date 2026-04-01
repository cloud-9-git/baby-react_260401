# Parallel Development Guide

## 목적

이 문서는 `Baby React Emoji Reaction Board`를 4명이 병렬 개발하기 전에 공유하는 팀 기준 문서다.

이번 라운드의 목표는 두 가지다.

1. 기존 Virtual DOM 엔진 위에 `key` 보완과 `COMPONENT_NODE`를 안정적으로 도입한다.
2. 발표용 데모를 `사용자 데모 앱 + 디버그 패널` 구조로 재구성한다.

현재 저장소에는 `Coding Sprint Board` 데모가 들어 있지만, 이번 작업의 최종 발표 대상은 `Emoji Reaction Board` 기반의 새 데모다.

## 이번 라운드에서 고정된 정책

- Hook은 `root-only`를 유지한다.
- `COMPONENT_NODE`는 중간 표현으로만 사용한다.
- `resolveVNodeTree()`가 `COMPONENT_NODE`를 `ELEMENT_NODE` / `TEXT_NODE` 트리로 먼저 풀어준다.
- `diff`, `applyPatches`, `vdomToDom`, `renderTo`는 resolved tree만 다룬다.
- `MOVE` 패치는 이번 라운드에서 도입하지 않는다.
- `key`는 `props` 안이 아니라 vnode 최상위 필드로 둔다.
- `componentNode()`의 자식은 `props.children`으로만 전달한다.
- 데모패널은 런타임 내부 배열을 직접 읽지 않고 `getDebugSnapshot()`과 `subscribeDebug()`만 사용한다.

세부 계약은 [Architecture_Contracts.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md)에 정리한다.

GitHub 발행 절차는 [GitHub_Autopublish_Workflow.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/GitHub_Autopublish_Workflow.md)를 따른다.

## 최종 데모 범위

### A. 사용자 데모 앱 기능

- 이모지 반응 클릭으로 투표 누적
- 총 투표 수 계산
- 현재 1위 반응 계산
- 득표율 계산
- 최근 반응 기록 누적
- 전체 리셋
- 결과 저장
- 저장 시각 기록
- `localStorage` 저장/복구
- `document.title` 동기화

### B. 3개 추가 버전 기능

기존 범위에 아래 3개를 추가한다.

1. Last Action Log
   - 마지막 사용자 액션과 액션 payload 요약
   - 예: `click: wow`, `reset`, `save`
2. Render Trace Log
   - 이번 상호작용에서 어떤 컴포넌트가 다시 렌더됐는지 추적
3. Patch Summary Log
   - 마지막 patch를 `type + path + summary` 형태로 요약
   - 예: `TEXT @ [0,1,0]`, `PROPS @ [1,2]`

## 역할 분담

### A. Key / Reconciliation

목표:

- vnode에 `key`를 보존한다.
- keyed child matching을 도입한다.
- 기존 diff/patch 경로를 가능한 한 적게 깨뜨린다.

주요 파일:

- `src/constants.js`
- `src/runtime/createElement.js`
- `src/lib/vnodeUtils.js`
- `src/lib/diff.js`
- 필요 시 `tests/lib/diff.test.js`
- 필요 시 `tests/lib/edgeCases.test.js`

완료 기준:

- `key`가 vnode에 보존된다.
- key가 있는 sibling 리스트가 안정적으로 비교된다.
- `MOVE` 없이 `ADD/REMOVE/REPLACE/PROPS/TEXT` 조합으로 처리된다.

### B. Component Node / Resolve / Runtime Debug Backbone

목표:

- `COMPONENT_NODE`를 도입한다.
- resolve 단계에서 `COMPONENT_NODE`를 실제 렌더 트리로 푼다.
- 디버그 패널이 읽을 수 있는 최소 debug snapshot API를 만든다.

주요 파일:

- `src/constants.js`
- `src/runtime/createElement.js`
- 새 `src/runtime/resolveVNodeTree.js`
- `src/runtime/FunctionComponent.js`
- 필요 시 `src/runtime/context.js`
- 필요 시 `src/lib.js`

완료 기준:

- 함수형 컴포넌트 호출 결과가 resolved tree로 변환된다.
- 기존 `diff`와 `vdomToDom`는 `COMPONENT_NODE`를 직접 처리하지 않는다.
- `getDebugSnapshot()`과 `subscribeDebug()`가 동작한다.

### C. Demo App Front + Back

목표:

- 기존 `Coding Sprint Board`를 `Emoji Reaction Board` 데모로 교체한다.
- 백은 서버가 아니라 상태/액션/셀렉터 레이어를 뜻한다.
- 발표용 상호작용 흐름을 완성한다.

주요 파일:

- 새 `src/demo/app/EmojiReactionBoardApp.js`
- 새 `src/demo/app/data.js`
- 새 `src/demo/app/state.js`
- `src/demo/main.js`
- `index.html`
- 필요 시 기존 `src/demo/CodingSprintBoardApp.js`

완료 기준:

- 사용자가 반응을 보내고 결과가 즉시 갱신된다.
- 저장/복구/리셋이 동작한다.
- 데모앱만 봐도 상태, 파생값, props 흐름 설명이 가능하다.

### D. Debug Panel Front + Back + Test Integration

목표:

- 같은 페이지 안에서 디버그 패널을 별도 앱으로 mount한다.
- debug snapshot을 소비해 로그 중심 패널을 만든다.
- 통합 테스트와 최종 실행 체크를 맡는다.

주요 파일:

- 새 `src/demo/panel/DebugPanelApp.js`
- 새 `src/demo/panel/components/*`
- 새 `src/debug/*`
- `src/demo/main.js`
- `index.html`
- 새 `tests/debug/*`
- 새 `tests/demo/emojiReactionBoard.test.js`
- 새 `tests/runtime/componentNode.test.js`
- 새 `tests/lib/keyedDiff.test.js`

완료 기준:

- 데모앱과 패널이 한 페이지에 함께 보인다.
- 패널이 debug API만으로 상태를 그린다.
- 최종 테스트 실행 결과를 정리할 수 있다.

## 권장 폴더 구조

```text
src/
  demo/
    app/
      EmojiReactionBoardApp.js
      data.js
      state.js
    panel/
      DebugPanelApp.js
      components/
        ActionLogPanel.js
        RenderTracePanel.js
        PatchSummaryPanel.js
    main.js
  debug/
    debugStore.js
    debugSnapshot.js
  runtime/
    createElement.js
    FunctionComponent.js
    resolveVNodeTree.js
tests/
  demo/
    emojiReactionBoard.test.js
  debug/
    debugPanel.test.js
  runtime/
    componentNode.test.js
  lib/
    keyedDiff.test.js
```

## 공용 개발 규칙

- 기존 엔진의 공개 동작을 깨지 않도록 회귀 테스트를 유지한다.
- 각 역할은 자기 소유 파일 중심으로 작업한다.
- 공용 핵심 파일은 함수 단위로 소유권을 분리한다.
- `constants.js`와 `createElement.js`는 A와 B가 먼저 합의 후 작업한다.
- C와 D는 mock data / mock snapshot으로 먼저 UI를 시작할 수 있다.
- 패널 UI는 런타임 내부 구조에 직접 의존하지 않는다.
- 새 기능은 가능하면 새 파일을 추가해 붙인다.
- 각 에이전트는 작업 완료 후 GitHub 자동 발행 절차까지 수행한다.

## 파일 소유권 기준

| 범위 | 1차 오너 | 참고 |
|---|---|---|
| `src/constants.js` | A + B 공동 합의 | 먼저 shape 고정 후 수정 |
| `src/runtime/createElement.js` | A + B 공동 합의 | key 추출과 component node 생성 경계 분리 |
| `src/runtime/resolveVNodeTree.js` | B | 신규 파일 권장 |
| `src/runtime/FunctionComponent.js` | B | debug API 포함 |
| `src/lib/diff.js` | A | keyed diff 핵심 |
| `src/lib/applyPatches.js` | 기존 유지 | 이번 라운드는 MOVE 제외라 최소 수정 예상 |
| `src/demo/app/*` | C | 데모 기능 전담 |
| `src/demo/panel/*` | D | 패널 전담 |
| `src/debug/*` | D | B와 인터페이스 협의 |
| `tests/lib/*` | A | key 관련 회귀 |
| `tests/runtime/*` | B | component node / resolve |
| `tests/demo/*` | C + D | 상호작용 / 통합 |
| `tests/debug/*` | D | 패널 전담 |

## 일정 제안

### Day 0

- `VNode`, `DebugSnapshot`, `resolveVNodeTree` 계약 합의
- Hook 정책과 `MOVE` 제외 방침 문서화
- 폴더 구조와 파일 소유권 공유

### Day 1

- A: keyed diff 초안
- B: component node + resolve 초안
- C: 데모앱 mock 데이터 기반 화면
- D: 패널 mock snapshot 기반 화면

### Day 2

- A/B 엔진 통합
- C 데모 로직 연결
- D debug API 연결
- 테스트 초안 보강

### Day 3

- 통합 테스트
- 회귀 테스트
- 발표 흐름 기준 polish
- 각자 이슈 브랜치 push 및 PR 생성

## 머지 순서

1. A/B 공통 계약 반영
2. B의 resolve + debug API
3. A의 keyed diff
4. C의 데모앱
5. D의 패널 및 통합 테스트

## 최종 검증 명령

```bash
npm test -- --run
npm run build
```

## 발표 포인트

- 모든 상태는 루트 컴포넌트에 있다.
- 자식 컴포넌트는 props만 받아 렌더링한다.
- 상태 변경 후 새 트리를 만들고 diff/patch로 필요한 부분만 갱신한다.
- `COMPONENT_NODE`는 디버깅과 트리 설명을 돕지만, 실제 DOM 패치 단계에는 직접 들어가지 않는다.
- 디버그 패널은 액션, 렌더, 패치 로그만 다루고 학습/설명 전용 섹션은 두지 않는다.
- `key`는 reconciliation 품질을 높이지만 이번 라운드는 `MOVE` 없이 안전하게 간다.
