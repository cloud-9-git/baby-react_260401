# Agent B Brief

## 역할

당신은 `COMPONENT_NODE`, resolve 단계, runtime debug backbone 담당이다.

## 목표

- 함수형 컴포넌트를 즉시 실행하지 않고 `COMPONENT_NODE`로 보존한다.
- `resolveVNodeTree()`에서 resolved tree로 변환한다.
- 디버그 패널이 읽을 수 있는 snapshot API를 제공한다.

## 반드시 지킬 계약

- Hook은 `root-only` 유지다.
- `COMPONENT_NODE`는 `diff`, `vdomToDom`, `applyPatches`에 직접 들어가지 않는다.
- `children`은 `props.children`으로만 전달한다.
- `getDebugSnapshot()`과 `subscribeDebug()`를 제공한다.

## 우선 읽을 문서

- [Parallel_Development_Guide.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Parallel_Development_Guide.md)
- [Architecture_Contracts.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md)
- [GitHub_Autopublish_Workflow.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/GitHub_Autopublish_Workflow.md)

## 우선 확인할 파일

- `src/constants.js`
- `src/runtime/createElement.js`
- `src/runtime/FunctionComponent.js`
- `src/runtime/context.js`
- `src/runtime/hooks.js`
- `src/lib.js`
- `tests/runtime/FunctionComponent.test.js`

## 작업 범위

1. `NodeType.COMPONENT`와 `componentNode()` 추가
2. `createElement()`가 함수 type에서 `COMPONENT_NODE`를 반환하도록 변경
3. 신규 `resolveVNodeTree.js` 추가
4. `FunctionComponent.mount/update/renderComponent` 경로를 resolved tree 기준으로 정리
5. `getDebugSnapshot()`과 `subscribeDebug()` 추가
6. `lastAction`, `renderTrace`, `lastPatches` 중심의 snapshot 필드를 제공

## 하지 말 것

- child component hook 허용으로 확장하지 말 것
- `MOVE` patch를 추가하지 말 것
- 패널 UI를 직접 구현하지 말 것
- 데모앱 기능 로직을 건드리지 말 것

## 완료 조건

- 함수형 컴포넌트가 `COMPONENT_NODE`로 표현된다.
- resolve 이후 tree에는 `COMPONENT_NODE`가 남지 않는다.
- 기존 root-only hook 정책이 유지된다.
- D가 mock 없이도 패널 연동을 시작할 수 있다.

## 협업 포인트

- A와 `createElement()` 경계를 먼저 확정한다.
- D와 `DebugSnapshot` shape를 먼저 맞춘다.

## 완료 후 GitHub 절차

- 이슈 브랜치가 없으면 `$gh-create-issue-branch`를 기본값으로 사용한다.
- 작업이 끝나면 `$gh-create-pr`를 기본값으로 사용한다.
- 최종 보고에 issue URL, branch 이름, PR URL을 포함한다.
