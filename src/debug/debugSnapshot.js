function createBaseSnapshot() {
  return {
    renderCount: 0,
    isMounted: false,
    isUpdateScheduled: false,
    lastPatches: [],
    renderTrace: [],
    lastAction: null,
  };
}

export function createEmptyDebugSnapshot() {
  return createBaseSnapshot();
}

export function createMockDebugSnapshot(overrides = {}) {
  return normalizeDebugSnapshot({
    renderCount: 3,
    isMounted: true,
    isUpdateScheduled: false,
    lastPatches: [
      { type: "TEXT", path: [0, 1, 0], summary: '텍스트 -> "3표"' },
      { type: "PROPS", path: [1, 0], summary: "className, aria-pressed" },
    ],
    renderTrace: [
      { name: "App", reason: "상태[0] 업데이트됨" },
      { name: "ReactionButton", reason: "부모 업데이트로 렌더됨", key: "wow" },
    ],
    lastAction: {
      type: "react",
      payload: { emoji: "wow" },
    },
    ...overrides,
  });
}

export function normalizeDebugSnapshot(snapshot) {
  const base = createBaseSnapshot();

  if (!isPlainObject(snapshot)) {
    return base;
  }

  return {
    renderCount: normalizeCount(snapshot.renderCount),
    isMounted: Boolean(snapshot.isMounted),
    isUpdateScheduled: Boolean(snapshot.isUpdateScheduled),
    lastPatches: normalizePatchSummaryList(snapshot.lastPatches),
    renderTrace: normalizeRenderTraceList(snapshot.renderTrace),
    lastAction: normalizeDebugAction(snapshot.lastAction),
  };
}

export function normalizeDebugAction(action) {
  if (!isPlainObject(action) || typeof action.type !== "string" || action.type.trim() === "") {
    return null;
  }

  return {
    type: action.type.trim(),
    payload: normalizeDebugPayload(action.payload),
  };
}

export function summarizePatches(patches) {
  if (!Array.isArray(patches)) {
    return [];
  }

  return patches.map((patch) => {
    const path = Array.isArray(patch?.path)
      ? patch.path.filter((segment) => Number.isInteger(segment) && segment >= 0)
      : [];

    return {
      type: typeof patch?.type === "string" ? patch.type : "UNKNOWN",
      path,
      summary: createPatchSummary(patch),
    };
  });
}

export function formatDebugPanelModel(snapshot) {
  const normalized = normalizeDebugSnapshot(snapshot);

  return {
    renderCount: normalized.renderCount,
    isMounted: normalized.isMounted,
    isUpdateScheduled: normalized.isUpdateScheduled,
    actionText: formatDebugAction(normalized.lastAction),
    actionPayloadText: formatDebugPayload(normalized.lastAction?.payload),
    renderTraceItems: normalized.renderTrace.map((entry) => ({
      ...entry,
      label: formatRenderTraceEntry(entry),
    })),
    patchItems: normalized.lastPatches.map((entry) => ({
      ...entry,
      label: formatPatchSummaryEntry(entry),
    })),
  };
}

export function formatDebugAction(action) {
  const normalized = normalizeDebugAction(action);

  if (!normalized) {
    return "아직 액션이 없습니다";
  }

  const payloadText = formatDebugPayload(normalized.payload);
  const actionType = localizeActionType(normalized.type);

  return payloadText === "페이로드 없음" ? actionType : `${actionType}: ${payloadText}`;
}

export function formatRenderTraceEntry(entry) {
  if (!isPlainObject(entry) || typeof entry.name !== "string" || entry.name.trim() === "") {
    return "알 수 없는 컴포넌트";
  }

  const displayName = localizeComponentName(entry.name.trim());
  const keyText =
    typeof entry.key === "string" && entry.key.trim() !== "" ? ` [${entry.key.trim()}]` : "";
  const reasonText =
    typeof entry.reason === "string" && entry.reason.trim() !== ""
      ? entry.reason.trim()
      : "렌더됨";

  return `${displayName}${keyText} - ${reasonText}`;
}

export function formatPatchSummaryEntry(entry) {
  if (!isPlainObject(entry) || typeof entry.type !== "string") {
    return "알 수 없음 @ []";
  }

  const path = Array.isArray(entry.path) ? entry.path : [];
  const pathText = `[${path.join(",")}]`;
  const summary =
    typeof entry.summary === "string" && entry.summary.trim() !== ""
      ? `: ${entry.summary.trim()}`
      : "";

  return `${localizePatchType(entry.type)} @ ${pathText}${summary}`;
}

export function formatDebugPayload(payload) {
  const normalized = normalizeDebugPayload(payload);
  const entries = Object.entries(normalized);

  if (entries.length === 0) {
    return "페이로드 없음";
  }

  return entries.map(([key, value]) => `${localizePayloadKey(key)}=${formatScalar(value)}`).join(", ");
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizePatchSummaryList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    if (isPatchSummary(entry)) {
      return {
        type: entry.type,
        path: [...entry.path],
        summary: entry.summary.trim(),
      };
    }

    return summarizePatches([entry])[0];
  });
}

function normalizeRenderTraceList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isPlainObject(entry) && typeof entry.name === "string" && entry.name.trim() !== "")
    .map((entry) => {
      const normalizedEntry = {
        name: entry.name.trim(),
        reason:
          typeof entry.reason === "string" && entry.reason.trim() !== ""
            ? entry.reason.trim()
            : "렌더됨",
      };

      if (typeof entry.key === "string" && entry.key.trim() !== "") {
        normalizedEntry.key = entry.key.trim();
      }

      return normalizedEntry;
    });
}

function isPatchSummary(value) {
  return (
    isPlainObject(value) &&
    typeof value.type === "string" &&
    Array.isArray(value.path) &&
    value.path.every((segment) => Number.isInteger(segment) && segment >= 0) &&
    typeof value.summary === "string"
  );
}

function createPatchSummary(patch) {
  switch (patch?.type) {
    case "TEXT":
      return `텍스트 -> ${formatScalar(patch?.value ?? "")}`;
    case "PROPS":
      return Object.keys(isPlainObject(patch?.props) ? patch.props : {}).join(", ") || "속성 변경";
    case "ADD":
      return `${describeNode(patch?.node)} 추가`;
    case "REMOVE":
      return "노드 삭제";
    case "REPLACE":
      return `${describeNode(patch?.node)}로 교체`;
    default:
      return "";
  }
}

function describeNode(node) {
  if (!isPlainObject(node) || typeof node.nodeType !== "string") {
    return "노드";
  }

  if (node.nodeType === "TEXT_NODE") {
    return `텍스트(${formatScalar(node.value ?? "")})`;
  }

  if (typeof node.type === "string" && node.type.trim() !== "") {
    return `<${node.type.trim()}>`;
  }

  return node.nodeType;
}

function normalizeDebugPayload(payload) {
  if (!isPlainObject(payload)) {
    return {};
  }

  const normalized = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value == null) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
      continue;
    }

    normalized[key] = String(value);
  }

  return normalized;
}

function formatScalar(value) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function localizeActionType(type) {
  switch (type) {
    case "react":
      return "반응";
    case "save":
      return "저장";
    case "restore":
      return "복원";
    case "reset":
      return "초기화";
    default:
      return type;
  }
}

function localizePatchType(type) {
  switch (type) {
    case "TEXT":
      return "텍스트";
    case "PROPS":
      return "속성";
    case "ADD":
      return "추가";
    case "REMOVE":
      return "삭제";
    case "REPLACE":
      return "교체";
    default:
      return type;
  }
}

function localizePayloadKey(key) {
  switch (key) {
    case "emoji":
      return "이모지";
    case "emojiId":
      return "이모지ID";
    case "label":
      return "레이블";
    case "totalVotes":
      return "총투표수";
    case "savedAt":
      return "저장시각";
    case "selectedEmoji":
      return "선택이모지";
    case "restored":
      return "복원됨";
    case "tag":
      return "태그";
    case "scope":
      return "범위";
    case "count":
      return "개수";
    default:
      return key;
  }
}

function localizeComponentName(name) {
  switch (name) {
    case "App":
      return "앱";
    case "ReactionButton":
      return "반응버튼";
    case "EmojiReactionBoardApp":
      return "이모지반응보드앱";
    case "MetricsCards":
      return "지표카드";
    case "RecentActivity":
      return "최근활동";
    case "SidebarPersistenceControls":
      return "저장컨트롤";
    case "Anonymous":
      return "익명컴포넌트";
    default:
      return name;
  }
}
