// 어떤 컴포넌트가 렌더링 중인지 관리

// 빈 변수 제작: 현재 헨더링 중인 컴포넌트 인스턴스, root인지 child인지 나타냄
let currentInstance = null;
let currentRenderKind = null;
// 렌더링 컨택스트 설정 및 복원
// 
export function withRenderContext(instance, kind, callback) {
  // current 컴포넌트 상태를 previous에 백업
  const previousInstance = currentInstance;
  const previousKind = currentRenderKind;
  // 전역 변수에 새 인스턴스 세팅(current)
  currentInstance = instance;
  currentRenderKind = kind;
  // callback 실행: FunctionComponent.js나 createElement.js가 컴포넌트 함수를 넘겨줌
  // callback 안에서 useState 등 hook 함수가 getCurrentInstance()를 호출하면
  // 위에서 세팅한 currentInstance를 받아서, 그 컴포넌트의 hooks 배열에 상태를 저장함
  try {
    return callback();
  } finally {
    // 에러가 나도 반드시 실행됨 — 이전 컨텍스트로 복원
    currentInstance = previousInstance;
    currentRenderKind = previousKind;
  }
}
// 지금 렌더링 중인 컴포넌트를 알려줌
// import는 다른 파일에서 이 함수를 가져다 쓸 수 있게 내보내는 것
export function getCurrentInstance() {
  return currentInstance;
}
// 루트 컴포넌트인지 물어봄
export function isRootRender() {
  return currentInstance !== null && currentRenderKind === "root";
}
