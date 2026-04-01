# Agent D Brief

## 역할

당신은 디버그 패널 프론트 + 백, 그리고 통합 테스트 담당이다.

## 목표

- 한 페이지 안에서 데모앱과 나란히 보이는 디버그 패널을 만든다.
- runtime debug snapshot을 소비해 로그 중심 패널을 구현한다.
- 최종 테스트 실행과 통합 검증을 맡는다.

## 반드시 지킬 계약

- 패널은 `getDebugSnapshot()`과 `subscribeDebug()`만 사용한다.
- 패널은 runtime 내부 배열/필드에 직접 접근하지 않는다.
- mock snapshot으로 먼저 개발한 뒤 실제 API에 연결한다.

## 우선 읽을 문서

- [Parallel_Development_Guide.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Parallel_Development_Guide.md)
- [Architecture_Contracts.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md)
- [GitHub_Autopublish_Workflow.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/GitHub_Autopublish_Workflow.md)

## 우선 확인할 파일

- `src/demo/main.js`
- `index.html`
- `tests/demo/codingSprintBoard.test.js`
- `tests/runtime/FunctionComponent.test.js`

## 구현 범위

### 패널 UI

- Last Action Log Panel
- Render Trace Panel
- Patch Summary Panel

### 패널 로직

- debug snapshot 구독
- snapshot -> UI model 변환
- mock snapshot 생성기

### 테스트

- debug snapshot 렌더 테스트
- 패널 갱신 테스트
- 데모앱 + 패널 통합 테스트
- 최종 전체 테스트 실행

## 권장 파일 구조

- `src/demo/panel/DebugPanelApp.js`
- `src/demo/panel/components/*`
- `src/debug/debugStore.js`
- `src/debug/debugSnapshot.js`
- `tests/debug/debugPanel.test.js`
- `tests/demo/emojiReactionBoard.test.js`

## 하지 말 것

- 런타임 내부를 우회 접근하지 말 것
- A/B의 코어 로직을 대신 수정하지 말 것
- 데모앱 UI를 패널과 강결합하지 말 것

## 완료 조건

- 같은 페이지 안에서 데모앱과 패널이 함께 보인다.
- snapshot 변경 시 패널이 갱신된다.
- last action / render trace / patch summary가 표시된다.
- 최종 테스트 실행 결과를 팀에 공유할 수 있다.

## 협업 포인트

- B와 `DebugSnapshot` shape를 먼저 확정한다.
- C와 `lastAction` 및 사용자 이벤트 명세를 맞춘다.

## 완료 후 GitHub 절차

- 이슈 브랜치가 없으면 `$gh-create-issue-branch`를 기본값으로 사용한다.
- 작업이 끝나면 `$gh-create-pr`를 기본값으로 사용한다.
- 최종 보고에 issue URL, branch 이름, PR URL을 포함한다.
