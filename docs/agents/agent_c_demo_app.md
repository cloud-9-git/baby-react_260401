# Agent C Brief

## 역할

당신은 `Baby React Emoji Reaction Board` 데모앱의 프론트 + 백 담당이다.

여기서 백은 서버가 아니라 앱 상태, 액션, 셀렉터 레이어를 뜻한다.

## 목표

- 발표용 상호작용이 명확한 데모앱을 완성한다.
- 루트 state, props 전달, memo 기반 파생값을 자연스럽게 보여준다.
- 패널 없이도 데모앱 자체가 이해 가능한 수준으로 만든다.

## 우선 읽을 문서

- [Parallel_Development_Guide.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Parallel_Development_Guide.md)
- [Architecture_Contracts.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/Architecture_Contracts.md)
- [GitHub_Autopublish_Workflow.md](/Users/wiseungcheol/Desktop/W5_React/React/docs/GitHub_Autopublish_Workflow.md)

## 우선 확인할 파일

- `src/demo/CodingSprintBoardApp.js`
- `src/demo/data.js`
- `src/demo/main.js`
- `index.html`
- `tests/demo/codingSprintBoard.test.js`

## 구현할 기능

### 기본 기능

- 이모지 반응 보내기
- 총 투표 수 계산
- 현재 1위 계산
- 득표율 계산
- 최근 반응 기록
- 전체 리셋
- 결과 저장
- 저장 시각 기록
- `localStorage` 저장/복구
- `document.title` 동기화

### 3개 추가 버전 기능

- Last Action Log 데이터 생성
- Render Trace 데이터 생성
- Patch Summary 패널과 연결 가능한 사용자 액션 맥락 제공

## 권장 파일 구조

- `src/demo/app/EmojiReactionBoardApp.js`
- `src/demo/app/data.js`
- `src/demo/app/state.js`
- `src/demo/main.js`

## 상태 후보

- `votes`
- `selectedEmoji`
- `recentReactions`
- `savedAt`
- `lastAction`

## 파생값 후보

- `totalVotes`
- `sortedResults`
- `topReaction`
- `topPercentage`

## 하지 말 것

- 런타임 내부 구조에 직접 의존하지 말 것
- `instance.hooks`를 직접 읽지 말 것
- 패널 구현을 앱 안에 강하게 묶지 말 것
- component node 아키텍처를 직접 수정하지 말 것

## 완료 조건

- 데모앱만 실행해도 핵심 흐름이 설명 가능하다.
- 반응, 리셋, 저장, 복구가 동작한다.
- props로만 동작하는 자식 컴포넌트 구조가 드러난다.
- 최소한 앱 단독 테스트가 있다.

## 협업 포인트

- D와 `lastAction` shape를 공유한다.
- B가 제공하는 debug API는 패널 전용이므로 앱은 직접 기대지 않는다.

## 완료 후 GitHub 절차

- 이슈 브랜치가 없으면 `$gh-create-issue-branch`를 기본값으로 사용한다.
- 작업이 끝나면 `$gh-create-pr`를 기본값으로 사용한다.
- 최종 보고에 issue URL, branch 이름, PR URL을 포함한다.
