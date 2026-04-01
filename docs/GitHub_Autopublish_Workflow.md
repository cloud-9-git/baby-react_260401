# GitHub Autopublish Workflow

## 목적

각 에이전트는 자기 파트 개발이 끝나면 결과를 로컬에만 두지 않고, GitHub 이슈/브랜치/PR까지 이어지는 동일한 마감 절차를 따른다.

이번 문서는 skill 폴더의 GitHub 자동화 스킬을 사용할 때의 팀 기본값을 정리한다.

사용 스킬:

- `$gh-create-issue-branch`
- `$gh-create-pr`

## 기본 정책

- 작업 시작 시 현재 브랜치가 이슈 브랜치가 아니면 `$gh-create-issue-branch`를 사용한다.
- 작업 완료 시에는 반드시 `$gh-create-pr`를 사용한다.
- 특별한 지시가 없으면 기본값을 유지한다.
- 이슈/PR 제목과 본문은 한국어 기준으로 작성한다.
- assignee는 기본값 `@me`
- type prefix는 기본값 `feat`
- repo override는 비워 둔다.
- base branch override는 비워 둔다.
- push는 기본으로 수행한다.

## 브랜치 정책

- 이슈 생성 스킬은 `<type>-#<issue-number>` 형식의 브랜치를 만든다.
- 각 에이전트는 자기 작업을 해당 브랜치에 올린다.
- 이미 이슈 브랜치에서 작업 중이면 이슈 생성은 건너뛴다.

## 완료 시 자동 마감 절차

1. 현재 작업을 정리한다.
2. 관련 테스트를 실행한다.
3. 변경사항을 커밋한다.
4. 원격 브랜치로 push한다.
5. `$gh-create-pr`로 PR을 만든다.
6. 최종 보고에 issue URL, branch 이름, PR URL을 함께 남긴다.

## 스킬 사용 기본값

### Issue 생성 기본값

- 타입 prefix: `feat`
- assignee: `@me`
- repo override: 없음
- push: 수행

기본 입력 템플릿:

```text
제목 초안:
설명 초안:
Repo override(선택):
타입 prefix(기본값: feat):
Assignee(기본값: @me):
```

### PR 생성 기본값

- 타입 prefix: `feat`
- assignee: `@me`
- base branch override: 없음
- issue 번호 override: 없음

기본 입력 템플릿:

```text
제목 초안:
설명 초안:
타입 prefix(기본값: feat):
Base branch(선택):
Assignee(기본값: @me):
Issue 번호 override(현재 브랜치에서 못 찾을 때만):
```

## 역할별 기본 제목 초안

### A

- 이슈 제목 초안: `key reconciliation 보완`
- PR 제목 초안: `key reconciliation 보완`

### B

- 이슈 제목 초안: `component node 및 resolve 단계 도입`
- PR 제목 초안: `component node 및 resolve 단계 도입`

### C

- 이슈 제목 초안: `emoji reaction board 데모앱 구현`
- PR 제목 초안: `emoji reaction board 데모앱 구현`

### D

- 이슈 제목 초안: `debug panel 및 통합 테스트 구현`
- PR 제목 초안: `debug panel 및 통합 테스트 구현`

## 역할별 기본 설명 초안 가이드

### A

- key 보존
- keyed matching
- unkeyed fallback 유지
- 관련 테스트 추가

### B

- `COMPONENT_NODE` 도입
- `resolveVNodeTree()` 추가
- root-only hook 정책 유지
- debug snapshot API 추가

### C

- emoji reaction board 구현
- votes / recent reactions / save / reset 동작
- localStorage / title 동기화

### D

- action log / render trace / patch summary 패널 구현
- debug snapshot 연결
- 통합 테스트 추가 및 실행

## 에이전트 지시문에 넣을 문장

```text
작업을 마치면 docs/GitHub_Autopublish_Workflow.md를 따라 GitHub 마감 절차까지 진행해.
이미 issue-linked branch가 있으면 PR 생성만 하면 되고, 없으면 issue/branch부터 만들어.
특별한 지시가 없으면 기본값(feat, @me, no override)을 사용해.
최종 보고에는 issue URL, branch 이름, PR URL을 포함해.
```

## 주의사항

- 같은 작업에 대해 중복 이슈를 만들지 않는다.
- 이미 issue-linked branch에서 후속 작업 중이면 `$gh-create-pr`만 사용한다.
- working tree가 더러우면 무엇이 PR에 포함되는지 먼저 확인한다.
- 스킬이 `gh auth status`를 요구하므로 GitHub 로그인 상태를 먼저 확인한다.
