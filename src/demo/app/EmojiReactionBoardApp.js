import { createElement, useEffect, useMemo, useState } from "../../lib.js";
import { EMOJI_CATALOG, HERO_COPY, MAX_VISIBLE_RECENT_REACTIONS } from "./data.js";
import {
  createEmptyLiveState,
  createReactionEntry,
  formatRelativeTime,
  formatSavedAt,
  loadSavedSnapshot,
  persistSnapshot,
  selectSortedResults,
  selectTopPercentage,
  selectTopReaction,
  selectTotalVotes,
  serializeSnapshot,
} from "./state.js";

const h = createElement;
const MIN_DEBUG_RAIL_WIDTH = 384;
const DEFAULT_DEBUG_RAIL_WIDTH = 512;
const MAX_DEBUG_RAIL_WIDTH = 720;

export function EmojiReactionBoardApp() {
  const initialSnapshot = loadSavedSnapshot();
  const initialState = initialSnapshot ?? createEmptyLiveState();

  const [votes, setVotes] = useState(() => initialState.votes);
  const [selectedEmoji, setSelectedEmoji] = useState(() => initialState.selectedEmoji);
  const [recentReactions, setRecentReactions] = useState(() => initialState.recentReactions);
  const [savedAt, setSavedAt] = useState(() => initialState.savedAt);
  const [lastAction, setLastAction] = useState(() => initialState.lastAction);
  const [debugRailWidth, setDebugRailWidth] = useState(DEFAULT_DEBUG_RAIL_WIDTH);
  const [debugRailDragState, setDebugRailDragState] = useState(null);

  const totalVotes = useMemo(() => selectTotalVotes(votes), [votes]);
  const sortedResults = useMemo(() => selectSortedResults(votes), [votes]);
  const topReaction = useMemo(() => selectTopReaction(votes), [votes]);
  const topPercentage = useMemo(() => selectTopPercentage(votes), [votes]);
  const visibleRecentReactions = useMemo(
    () => recentReactions.slice(0, MAX_VISIBLE_RECENT_REACTIONS),
    [recentReactions],
  );
  const trendingReaction = visibleRecentReactions[0] ?? null;
  const savedAtLabel = formatSavedAt(savedAt);
  const lastActionJson = formatLastActionJson(lastAction);

  useEffect(() => {
    document.title = `베이비 리액트 이모지 보드 · ${topReaction?.emoji ?? "—"} 총 ${totalVotes}표`;
  }, [topReaction, totalVotes]);

  useEffect(() => {
    if (!debugRailDragState) {
      return undefined;
    }

    function handleMouseMove(event) {
      const viewportWidth = window.innerWidth || MAX_DEBUG_RAIL_WIDTH + 320;
      const maxWidth = Math.max(MIN_DEBUG_RAIL_WIDTH, Math.min(MAX_DEBUG_RAIL_WIDTH, viewportWidth - 320));
      const nextWidth = clamp(
        debugRailDragState.startWidth + (debugRailDragState.startX - event.clientX),
        MIN_DEBUG_RAIL_WIDTH,
        maxWidth,
      );

      setDebugRailWidth(nextWidth);
    }

    function handleMouseUp() {
      setDebugRailDragState(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [debugRailDragState]);

  function applyLiveState(nextState) {
    setVotes(nextState.votes);
    setSelectedEmoji(nextState.selectedEmoji);
    setRecentReactions(nextState.recentReactions);
    setSavedAt(nextState.savedAt);
    setLastAction(nextState.lastAction);
  }

  function handleReact(emojiId) {
    const emoji = EMOJI_CATALOG.find((item) => item.id === emojiId);

    if (!emoji) {
      return;
    }

    const nextVotes = {
      ...votes,
      [emoji.id]: (votes[emoji.id] ?? 0) + 1,
    };
    const reactionEntry = createReactionEntry(emoji, totalVotes);
    const nextRecentReactions = [reactionEntry, ...recentReactions].slice(0, 6);
    const nextSelectedEmoji = emoji.id;
    const nextAction = createAction("react", {
      payload: {
        emojiId: emoji.id,
        emoji: emoji.emoji,
        label: emoji.label,
        totalVotes: totalVotes + 1,
      },
      summary: `${emoji.emoji} ${emoji.label} 반응을 루트 투표 스토어로 보냈습니다.`,
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: `${emoji.label} 투표 수가 변경됨` },
        { name: "MetricsCards", reason: "파생 지표를 다시 계산함" },
        { name: "RecentActivity", reason: "최신 반응을 맨 앞에 추가함" },
      ],
      patchSummaryHints: [
        { type: "TEXT", target: "metric-total", summary: `총 투표 수 -> ${totalVotes + 1}` },
        { type: "PROPS", target: `emoji-${emoji.id}`, summary: "선택 강조 링을 갱신함" },
      ],
    });

    setVotes(nextVotes);
    setSelectedEmoji(nextSelectedEmoji);
    setRecentReactions(nextRecentReactions);
    setLastAction(nextAction);
  }

  function handleSave() {
    const timestamp = Date.now();
    const nextAction = createAction("save", {
      payload: {
        savedAt: timestamp,
        totalVotes,
      },
      summary: `${totalVotes}표를 브라우저 저장소에 저장했습니다.`,
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: "저장 시각이 갱신됨" },
        { name: "SidebarPersistenceControls", reason: "저장 타임스탬프가 새로고침됨" },
      ],
      patchSummaryHints: [
        { type: "TEXT", target: "saved-at", summary: `저장 시각 -> ${formatSavedAt(timestamp)}` },
      ],
    });
    const snapshot = serializeSnapshot({
      votes,
      selectedEmoji,
      recentReactions,
      savedAt: timestamp,
      lastAction: nextAction,
    });

    persistSnapshot(snapshot);
    setSavedAt(timestamp);
    setLastAction(nextAction);
  }

  function handleRestore() {
    const snapshot = loadSavedSnapshot();

    if (!snapshot) {
      const fallbackAction = createAction("restore", {
        payload: { restored: false },
        summary: "복원을 요청했지만 저장된 스냅샷이 없습니다.",
        renderTraceHints: [{ name: "EmojiReactionBoardApp", reason: "사용 가능한 스냅샷이 없음" }],
        patchSummaryHints: [{ type: "TEXT", target: "last-action", summary: "복원 동작 없음" }],
      });

      setLastAction(fallbackAction);
      return;
    }

    const nextAction = createAction("restore", {
      payload: {
        restored: true,
        selectedEmoji: snapshot.selectedEmoji,
        totalVotes: selectTotalVotes(snapshot.votes),
      },
      summary: "가장 최근 저장한 스냅샷을 현재 상태로 복원했습니다.",
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: "현재 상태를 저장 스냅샷으로 교체함" },
        { name: "MetricsCards", reason: "파생 지표를 다시 계산함" },
      ],
      patchSummaryHints: [
        { type: "REPLACE", target: "recent-activity", summary: "최근 활동 목록을 저장본으로 교체함" },
      ],
    });
    const nextState = {
      ...snapshot,
      lastAction: nextAction,
    };

    applyLiveState(nextState);
  }

  function handleReset() {
    const nextAction = createAction("reset", {
      payload: {
        preservedSnapshot: Boolean(loadSavedSnapshot()),
      },
      summary: "저장된 스냅샷은 유지한 채 현재 보드를 초기화했습니다.",
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: "현재 투표 수를 0으로 초기화함" },
        { name: "RecentActivity", reason: "활동 기록을 비움" },
      ],
      patchSummaryHints: [
        { type: "TEXT", target: "metric-total", summary: "총 투표 수 -> 0" },
      ],
    });

    applyLiveState({
      ...createEmptyLiveState(),
      lastAction: nextAction,
    });
  }

  function handleDebugRailResizeStart(event) {
    if (typeof window === "undefined") {
      return;
    }

    setDebugRailDragState({
      startX: event.clientX,
      startWidth: debugRailWidth,
    });
  }

  return h(
    "div",
    {
      className: "min-h-screen",
      style: `--debug-rail-width: ${debugRailWidth}px;`,
    },
    h(TopNavBar),
    h(
      "div",
      { className: "demo-shell" },
      h(
        "main",
        { className: "demo-main px-8 md:px-16 py-12", "data-role": "board-main" },
        h(HeroSection),
        h(MetricsCards, {
          totalVotes,
          topReaction,
          topPercentage,
        }),
        h(EmojiBoardSection, {
          emojiCatalog: EMOJI_CATALOG,
          selectedEmoji,
          onReact: handleReact,
        }),
        h(
          "section",
          { className: "grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20" },
          h(ReactionIntensity, { topReaction, trendingReaction }),
          h(RecentActivity, { recentReactions: visibleRecentReactions }),
        ),
      ),
      h(
        "aside",
        {
          className: "debug-rail hidden md:flex fixed right-0 top-0 h-full flex-col gap-6 p-8 overflow-y-auto",
          style: { width: `${debugRailWidth}px` },
        },
        h("button", {
          type: "button",
          className: "debug-resize-handle",
          "aria-label": "디버그 레일 크기 조절",
          title: "드래그해서 디버그 레일 크기를 조절하세요",
          "data-debug-ignore-action": "true",
          onMouseDown: handleDebugRailResizeStart,
        }),
        h(RightRailHost),
        h(SidebarActionCard, { lastActionJson }),
        h(SidebarPersistenceControls, {
          savedAtLabel,
          onSave: handleSave,
          onRestore: handleRestore,
          onReset: handleReset,
        }),
      ),
    ),
    h(Footer),
  );
}

function TopNavBar() {
  return h(
    "header",
    {
      className:
        "fixed top-0 w-full z-50 bg-[#effdf4]/70 backdrop-blur-xl flex justify-between items-center px-12 h-20",
    },
    h("div", { className: "font-['Bagel_Fat_One'] text-2xl tracking-tighter text-[#121e19]" }, "리액트런타임"),
    h(
      "nav",
      { className: "hidden md:flex items-center gap-8 font-['Bagel_Fat_One'] font-medium tracking-tight" },
      h(
        "a",
        {
          className: "text-[#006c46] font-bold border-b-2 border-[#006c46] pb-1 hover:scale-105 transition-transform duration-200",
          href: "#",
        },
        "문서",
      ),
      h(
        "a",
        {
          className: "text-[#121e19]/60 hover:scale-105 transition-transform duration-200",
          href: "#",
        },
        "예제",
      ),
      h(
        "a",
        {
          className: "text-[#121e19]/60 hover:scale-105 transition-transform duration-200",
          href: "#",
        },
        "깃허브",
      ),
    ),
    h(
      "div",
      { className: "flex items-center gap-4" },
      h("button", { className: "material-symbols-outlined text-[#006c46] p-2 hover:scale-105 transition-transform", type: "button" }, "settings"),
      h("button", { className: "material-symbols-outlined text-[#006c46] p-2 hover:scale-105 transition-transform", type: "button" }, "help"),
    ),
  );
}

function HeroSection() {
  return h(
    "section",
    { className: "mb-20 mt-10" },
    h(
      "p",
      { className: "font-label text-xs tracking-widest uppercase text-outline mb-6" },
      HERO_COPY.eyebrow,
    ),
    h(
      "h1",
      { className: "font-headline text-6xl md:text-8xl text-on-background tracking-tighter leading-none mb-8 max-w-4xl" },
      HERO_COPY.titlePrefix,
      " ",
      h("span", { className: "text-primary italic" }, HERO_COPY.titleAccent),
      h("br"),
      HERO_COPY.titleSuffix,
    ),
    h(
      "p",
      { className: "text-xl md:text-2xl text-on-surface-variant max-w-2xl leading-relaxed" },
      HERO_COPY.description,
    ),
  );
}

function MetricsCards({ totalVotes, topReaction, topPercentage }) {
  return h(
    "section",
    { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-20" },
    h(
      "div",
      {
        className: "bg-surface-container-low p-10 rounded-xl flex flex-col justify-between aspect-square md:aspect-auto",
        "data-role": "metric-total",
      },
      h("span", { className: "font-label text-xs tracking-widest uppercase text-outline" }, "총 투표 수"),
      h(
        "div",
        { className: "flex items-baseline gap-2" },
        h("span", { className: "text-6xl font-headline text-on-background" }, formatNumber(totalVotes)),
        h("span", { className: "text-primary font-bold" }, topReaction ? `${topReaction.emoji}` : "준비 완료"),
      ),
    ),
    h(
      "div",
      {
        className: "bg-primary-container p-10 rounded-xl flex flex-col justify-between aspect-square md:aspect-auto",
        "data-role": "metric-leader",
      },
      h("span", { className: "font-label text-xs tracking-widest uppercase text-on-primary-container" }, "현재 1위"),
      topReaction
        ? h(
            "div",
            { className: "flex items-center gap-4" },
            h("span", { className: "text-7xl" }, topReaction.emoji),
            h(
              "div",
              {},
              h("span", { className: "block font-headline text-2xl text-on-primary-container" }, topReaction.label),
              h("span", { className: "text-on-primary-container opacity-70" }, `${topReaction.votes}표`),
            ),
          )
        : h(
            "div",
            { className: "flex items-center gap-4" },
            h("span", { className: "text-7xl" }, "🫥"),
            h(
              "div",
              {},
              h("span", { className: "block font-headline text-2xl text-on-primary-container" }, "선두 없음"),
              h("span", { className: "text-on-primary-container opacity-70" }, "투표를 시작해 보세요"),
            ),
          ),
    ),
    h(
      "div",
      {
        className: "bg-secondary-container p-10 rounded-xl flex flex-col justify-between aspect-square md:aspect-auto",
        "data-role": "metric-percentage",
      },
      h("span", { className: "font-label text-xs tracking-widest uppercase text-on-secondary-container" }, "선두 점유율"),
      h(
        "div",
        { className: "flex items-baseline gap-2" },
        h("span", { className: "text-6xl font-headline text-on-secondary-container" }, topPercentage.toFixed(1)),
        h("span", { className: "text-2xl font-headline text-on-secondary-container" }, "%"),
      ),
    ),
  );
}

function EmojiBoardSection({ emojiCatalog, selectedEmoji, onReact }) {
  return h(
    "section",
    { className: "mb-20" },
    h(
      "div",
      { className: "flex items-end justify-between mb-8 gap-4" },
      h(
        "div",
        {},
        h("h2", { className: "font-headline text-3xl mb-2" }, "이모지 보드"),
        h("p", { className: "text-on-surface-variant" }, "이모지를 눌러 루트 스토어에 반응 액션을 보냅니다."),
      ),
      h(
        "div",
        { className: "bg-surface-container-highest px-4 py-2 rounded-full flex gap-2" },
        h("span", { className: "material-symbols-outlined text-primary", "data-icon": "filter_list" }, "filter_list"),
        h("span", { className: "font-label text-xs font-bold self-center" }, "전체 이모지"),
      ),
    ),
    h(
      "div",
      { className: "bg-surface-container-low p-8 md:p-12 rounded-xl" },
      h(
        "div",
        { className: "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4", "data-role": "emoji-grid" },
        emojiCatalog.map((emoji) =>
          h(
            "button",
            {
              key: emoji.id,
              type: "button",
              className: createEmojiButtonClassName(selectedEmoji === emoji.id),
              onClick: () => onReact(emoji.id),
              "data-emoji-id": emoji.id,
              "data-action": "react",
              "aria-label": `${emoji.label} 반응`,
              title: emoji.label,
            },
            emoji.emoji,
          )),
      ),
    ),
  );
}

function ReactionIntensity({ topReaction, trendingReaction }) {
  const centerEmoji = topReaction?.emoji ?? "🫥";
  const peakLabel = topReaction ? `${topReaction.emoji} 최고 반응` : "최고 반응 없음";
  const trendingLabel = trendingReaction ? `${trendingReaction.emoji} 급상승` : "대기 중";

  return h(
    "div",
    { className: "flex flex-col gap-6" },
    h("h3", { className: "font-headline text-2xl" }, "반응 강도"),
    h(
      "div",
      { className: "relative aspect-square w-full max-w-md mx-auto flex items-center justify-center" },
      h("div", { className: "absolute w-full h-full rounded-full border-[20px] border-primary/5" }),
      h("div", { className: "absolute w-4/5 h-4/5 rounded-full border-[20px] border-primary/10" }),
      h("div", { className: "absolute w-3/5 h-3/5 rounded-full border-[20px] border-primary/20" }),
      h(
        "div",
        { className: "absolute w-2/5 h-2/5 rounded-full border-[20px] border-primary/40 flex items-center justify-center" },
        h("span", { className: "text-4xl" }, centerEmoji),
      ),
      h(
        "div",
        { className: "absolute top-0 right-1/4 bg-surface-container-lowest shadow-lg px-3 py-1 rounded-full text-xs font-bold border border-outline-variant/20" },
        peakLabel,
      ),
      h(
        "div",
        { className: "absolute bottom-1/4 left-0 bg-surface-container-lowest shadow-lg px-3 py-1 rounded-full text-xs font-bold border border-outline-variant/20" },
        trendingLabel,
      ),
    ),
  );
}

function RecentActivity({ recentReactions }) {
  const activityItems =
    recentReactions.length > 0
      ? recentReactions.map((entry, index) =>
          h(
            "div",
            {
              key: entry.id,
              className: `flex items-center gap-4 p-4 bg-surface-container-low rounded-lg${index === 2 ? " opacity-60" : ""}`,
            },
            h(
              "div",
              { className: `w-10 h-10 rounded-full flex items-center justify-center font-bold ${entry.guestAvatarClassName}` },
              entry.guestInitials,
            ),
            h(
              "div",
              { className: "flex-1" },
              h(
                "p",
                { className: "text-sm font-medium" },
                `${entry.guestName} 님이 `,
                entry.emoji,
                h("span", { className: "text-outline" }, " 에 반응했어요"),
              ),
              h("p", { className: "text-xs text-outline" }, formatRelativeTime(entry.timestamp)),
            ),
          ))
      : [
          h(
            "div",
            { key: "empty", className: "flex items-center gap-4 p-4 bg-surface-container-low rounded-lg opacity-60" },
            h("div", { className: "w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold" }, "—"),
            h(
              "div",
              { className: "flex-1" },
              h("p", { className: "text-sm font-medium" }, "아직 반응이 없어요"),
              h("p", { className: "text-xs text-outline" }, "아무 이모지나 눌러 활동 피드를 시작해 보세요."),
            ),
          ),
        ];

  return h(
    "div",
    { className: "flex flex-col gap-6" },
    h("h3", { className: "font-headline text-2xl" }, "최근 활동"),
    h("div", { className: "space-y-4", "data-role": "recent-activity" }, activityItems),
  );
}

function RightRailHost() {
  return h(
    "div",
    { className: "mt-20" },
    h(
      "div",
      { className: "debug-rail-header" },
      h(
        "div",
        { className: "debug-rail-icon" },
        h("span", { className: "material-symbols-outlined", "data-icon": "terminal" }, "terminal"),
      ),
      h(
        "div",
        {},
        h("p", { className: "debug-rail-label" }, "런타임 모니터"),
        h("h4", { className: "font-['Bagel_Fat_One'] debug-rail-title" }, "실시간 디버그 레일"),
      ),
    ),
    h("div", { "data-panel-root": "", className: "min-h-[18rem]" }),
  );
}

function SidebarActionCard({ lastActionJson }) {
  return h(
    "div",
    { className: "debug-sidebar-card" },
    h("label", { className: "font-label text-[10px] tracking-[0.2em] uppercase debug-sidebar-label block" }, "마지막 액션"),
    h(
      "div",
      {
        className: "debug-sidebar-console",
        "data-role": "last-action",
      },
      h("pre", {}, lastActionJson),
    ),
  );
}

function SidebarPersistenceControls({ savedAtLabel, onSave, onRestore, onReset }) {
  return h(
    "div",
    { className: "debug-sidebar-card debug-controls mt-2 pt-8 flex flex-col gap-3" },
    h(
      "p",
      { className: "text-[10px] font-label tracking-[0.2em] uppercase debug-sidebar-label mb-1", "data-role": "saved-at" },
      `저장 시각 ${savedAtLabel}`,
    ),
    h(
      "button",
      {
        type: "button",
        className:
          "debug-control-button debug-control-button--primary w-full py-3 rounded-full text-xs font-bold font-label tracking-widest flex items-center justify-center gap-2 hover:opacity-90",
        onClick: onSave,
        "data-action": "save",
      },
      h("span", { className: "material-symbols-outlined text-sm", "data-icon": "save" }, "save"),
      "브라우저 저장소에 저장",
    ),
    h(
      "div",
      { className: "grid grid-cols-2 gap-3" },
      h(
        "button",
        {
          type: "button",
          className:
            "debug-control-button py-3 rounded-full text-[10px] font-bold font-label tracking-widest flex items-center justify-center gap-1 hover:opacity-90 transition-colors",
          onClick: onRestore,
          "data-action": "restore",
        },
        h("span", { className: "material-symbols-outlined text-sm", "data-icon": "restore" }, "restore"),
        "복원",
      ),
      h(
        "button",
        {
          type: "button",
          className:
            "debug-control-button py-3 rounded-full text-[10px] font-bold font-label tracking-widest flex items-center justify-center gap-1 hover:opacity-90 transition-colors",
          onClick: onReset,
          "data-action": "reset",
        },
        h("span", { className: "material-symbols-outlined text-sm", "data-icon": "delete_sweep" }, "delete_sweep"),
        "초기화",
      ),
    ),
  );
}

function Footer() {
  return h(
    "footer",
    { className: "demo-footer w-full border-t border-[#b2ccc0]/15 py-10 bg-[#effdf4] flex flex-col items-center justify-center gap-4" },
    h(
      "div",
      { className: "flex gap-8" },
      h("a", { className: "font-['Bagel_Fat_One'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19] hover:opacity-100 transition-opacity", href: "#" }, "개인정보"),
      h("a", { className: "font-['Bagel_Fat_One'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19] hover:opacity-100 transition-opacity", href: "#" }, "이용약관"),
      h("a", { className: "font-['Bagel_Fat_One'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19] hover:opacity-100 transition-opacity", href: "#" }, "변경내역"),
    ),
    h("p", { className: "font-['Bagel_Fat_One'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19]" }, "© 2024 랩 런타임. 모든 권리 보유."),
  );
}

function createEmojiButtonClassName(isSelected) {
  return [
    "emoji-grid-item aspect-square bg-surface-container-lowest rounded-lg text-3xl flex items-center justify-center hover:scale-110 active:scale-95 shadow-sm",
    isSelected ? "border-4 border-primary-fixed ring-4 ring-primary/10" : "",
  ].filter(Boolean).join(" ");
}

function createAction(type, { payload, summary, renderTraceHints, patchSummaryHints }) {
  return {
    type,
    payload,
    timestamp: Date.now(),
    summary,
    renderTraceHints,
    patchSummaryHints,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatLastActionJson(action) {
  if (!action) {
    return JSON.stringify({ 상태: "아직 액션이 없어요" }, null, 2);
  }

  return JSON.stringify(localizeActionForDisplay(action), null, 2);
}

function localizeActionForDisplay(action) {
  return {
    동작: localizeActionType(action.type),
    요약: typeof action.summary === "string" ? action.summary : "",
    시간: action.timestamp ? new Date(action.timestamp).toLocaleString("ko-KR") : "없음",
    데이터: localizePayloadObject(action.payload),
    렌더추적힌트: Array.isArray(action.renderTraceHints)
      ? action.renderTraceHints.map((hint) => ({
          컴포넌트: localizeComponentName(hint.name),
          이유: hint.reason ?? "",
        }))
      : [],
    패치요약힌트: Array.isArray(action.patchSummaryHints)
      ? action.patchSummaryHints.map((hint) => ({
          종류: localizePatchType(hint.type),
          대상: hint.target ?? "",
          요약: hint.summary ?? "",
        }))
      : [],
  };
}

function localizePayloadObject(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value != null)
      .map(([key, value]) => [localizePayloadKey(key), value]),
  );
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
      return type ?? "";
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
      return type ?? "";
  }
}

function localizePayloadKey(key) {
  switch (key) {
    case "emojiId":
      return "이모지ID";
    case "emoji":
      return "이모지";
    case "label":
      return "레이블";
    case "totalVotes":
      return "총투표수";
    case "savedAt":
      return "저장시각";
    case "restored":
      return "복원됨";
    case "selectedEmoji":
      return "선택이모지";
    case "preservedSnapshot":
      return "저장본유지";
    default:
      return key;
  }
}

function localizeComponentName(name) {
  switch (name) {
    case "EmojiReactionBoardApp":
      return "이모지반응보드앱";
    case "MetricsCards":
      return "지표카드";
    case "RecentActivity":
      return "최근활동";
    case "SidebarPersistenceControls":
      return "저장컨트롤";
    default:
      return name ?? "";
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
