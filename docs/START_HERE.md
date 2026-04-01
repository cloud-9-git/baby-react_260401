# START HERE

에이전트와 팀원이 새 작업을 시작할 때 가장 먼저 읽는 문서다.

## 문서 우선순위

현재 병렬 개발 라운드에서는 아래 순서를 기준으로 삼는다.

1. [START_HERE.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/START_HERE.md)
2. [Parallel_Development_Guide.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Parallel_Development_Guide.md)
3. [Architecture_Contracts.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md)
4. [GitHub_Autopublish_Workflow.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/GitHub_Autopublish_Workflow.md)
5. 역할별 브리프
   - [agent_a_key.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/agents/agent_a_key.md)
   - [agent_b_component_node.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/agents/agent_b_component_node.md)
   - [agent_c_demo_app.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/agents/agent_c_demo_app.md)
   - [agent_d_debug_panel_and_tests.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/agents/agent_d_debug_panel_and_tests.md)

## 현재 라운드의 기준 요약

- 목표 데모는 `Coding Sprint Board`가 아니라 `Baby React Emoji Reaction Board`다.
- Hook 정책은 `root-only`로 유지한다.
- `COMPONENT_NODE`는 중간 표현으로만 사용한다.
- `resolveVNodeTree()`가 `COMPONENT_NODE`를 실제 렌더 트리로 푼다.
- `diff`, `applyPatches`, `vdomToDom`, `renderTo`는 resolved tree만 처리한다.
- `key`는 vnode 최상위 필드에 둔다.
- `MOVE` 패치는 이번 라운드에서 도입하지 않는다.
- 디버그 패널은 `getDebugSnapshot()`과 `subscribeDebug()`만 사용한다.

## 기존 문서의 역할

### README.md

- 현재 저장소에 들어 있는 기존 구현 상태를 설명하는 문서
- `Coding Sprint Board` 기준 설명이 있으므로 새 라운드의 구현 기준으로 사용하지 않는다

### Initial_Project_Setup_Plan.md

- 프로젝트 초기 세팅 맥락을 설명하는 아카이브 문서
- 현재 병렬 개발 지침으로 사용하지 않는다

## 에이전트에게 줄 최소 지시문

```text
먼저 docs/START_HERE.md를 읽고,
그다음 docs/Parallel_Development_Guide.md와 docs/Architecture_Contracts.md를 읽어.
그 후 너의 역할 문서(docs/agents/...)만 기준으로 작업해.
작업을 마치면 docs/GitHub_Autopublish_Workflow.md를 따라 GitHub 마감 절차까지 진행해.
README.md와 Initial_Project_Setup_Plan.md는 참고용이지만, 현재 구현 기준은 아니다.
작업 후에는 수정 파일 / 구현 내용 / 테스트 결과 / 남은 이슈 순서로 보고해.
```
