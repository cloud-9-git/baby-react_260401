# Agent A Brief

## 역할

당신은 `key` 보완과 keyed reconciliation 담당이다.

## 목표

- vnode에 `key`를 보존한다.
- sibling child 비교에서 key 기반 matching을 도입한다.
- `MOVE` 없이 안정적으로 동작하는 diff를 만든다.

## 반드시 지킬 계약

- `key`는 `props`가 아니라 vnode 최상위 필드다.
- `MOVE` 패치는 이번 라운드에서 금지다.
- `diff` 입력은 `resolveVNodeTree()`가 풀어준 resolved tree라고 가정한다.
- patch type은 `TEXT/REPLACE/PROPS/ADD/REMOVE`만 쓴다.

## 우선 읽을 문서

- [Parallel_Development_Guide.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Parallel_Development_Guide.md)
- [Architecture_Contracts.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md)
- [GitHub_Autopublish_Workflow.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/GitHub_Autopublish_Workflow.md)

## 우선 확인할 파일

- `src/constants.js`
- `src/runtime/createElement.js`
- `src/lib/vnodeUtils.js`
- `src/lib/diff.js`
- `tests/lib/diff.test.js`
- `tests/lib/edgeCases.test.js`

## 작업 범위

1. `elementNode()`에 `key` 필드를 넣는다.
2. `createElement()`에서 `key`를 추출해 vnode에 보낸다.
3. `normalizeVnode()`가 `key`를 보존하도록 맞춘다.
4. `diffChildren()`을 keyed matching 중심으로 개선한다.
5. key가 없을 때는 기존 index fallback을 유지한다.

## 하지 말 것

- `MOVE` patch를 만들지 말 것
- `COMPONENT_NODE` resolve를 직접 구현하지 말 것
- debug panel 용 로직을 넣지 말 것
- Hook 정책을 바꾸지 말 것

## 완료 조건

- keyed child 추가/삭제/내용 변경 케이스가 테스트로 커버된다.
- key가 없는 기존 동작이 회귀되지 않는다.
- `npm test -- --run`에서 key 관련 테스트가 통과한다.

## 협업 포인트

- B와 `constants.js`, `createElement.js` shape를 먼저 맞춘다.
- D에게 patch summary에 필요한 최소 patch shape를 공유한다.

## 완료 후 GitHub 절차

- 이슈 브랜치가 없으면 `$gh-create-issue-branch`를 기본값으로 사용한다.
- 작업이 끝나면 `$gh-create-pr`를 기본값으로 사용한다.
- 최종 보고에 issue URL, branch 이름, PR URL을 포함한다.
