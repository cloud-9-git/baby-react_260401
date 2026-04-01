export const STORAGE_KEY = "coding-sprint-board";
export const STATUS_OPTIONS = ["all", "todo", "doing", "done"];
export const TASK_STATUSES = ["todo", "doing", "done"];
export const PRIORITY_OPTIONS = ["high", "medium", "low"];

const sampleTasks = [
  {
    id: "seed-1",
    title: "Hook 런타임 뼈대 만들기",
    status: "todo",
    priority: "high",
    owner: "위승철",
    estimate: 5,
  },
  {
    id: "seed-2",
    title: "Diff/Patch 이벤트 반영 검증",
    status: "doing",
    priority: "medium",
    owner: "이진혁",
    estimate: 3,
  },
  {
    id: "seed-3",
    title: "README 발표 흐름 정리",
    status: "done",
    priority: "low",
    owner: "양시준",
    estimate: 2,
  },
  {
    id: "seed-4",
    title: "브라우저 상호작용 테스트 보강",
    status: "todo",
    priority: "high",
    owner: "팀 공용",
    estimate: 4,
  },
];

let taskSequence = sampleTasks.length;

export function createDefaultDraft() {
  return {
    title: "",
    priority: "high",
    owner: "",
    estimate: "2",
  };
}

export function createSampleTasks() {
  return sampleTasks.map((task) => ({ ...task }));
}

export function createTaskId() {
  taskSequence += 1;
  return `task-${taskSequence}`;
}
