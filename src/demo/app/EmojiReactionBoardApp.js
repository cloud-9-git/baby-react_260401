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

export function EmojiReactionBoardApp() {
  const initialSnapshot = loadSavedSnapshot();
  const initialState = initialSnapshot ?? createEmptyLiveState();

  const [votes, setVotes] = useState(() => initialState.votes);
  const [selectedEmoji, setSelectedEmoji] = useState(() => initialState.selectedEmoji);
  const [recentReactions, setRecentReactions] = useState(() => initialState.recentReactions);
  const [savedAt, setSavedAt] = useState(() => initialState.savedAt);
  const [lastAction, setLastAction] = useState(() => initialState.lastAction);

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
  const lastActionJson = JSON.stringify(lastAction, null, 2) ?? "{}";

  useEffect(() => {
    document.title = `Baby React Emoji Board · ${topReaction?.emoji ?? "—"} ${totalVotes} votes`;
  }, [topReaction, totalVotes]);

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
      summary: `Dispatched ${emoji.emoji} ${emoji.label} to the root vote store.`,
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: `${emoji.label} vote count changed` },
        { name: "MetricsCards", reason: "derived metrics recalculated" },
        { name: "RecentActivity", reason: "latest reaction prepended" },
      ],
      patchSummaryHints: [
        { type: "TEXT", target: "metric-total", summary: `Total votes -> ${totalVotes + 1}` },
        { type: "PROPS", target: `emoji-${emoji.id}`, summary: "selected ring updated" },
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
      summary: `Saved ${totalVotes} votes to localStorage.`,
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: "savedAt updated" },
        { name: "SidebarPersistenceControls", reason: "save timestamp refreshed" },
      ],
      patchSummaryHints: [
        { type: "TEXT", target: "saved-at", summary: `Saved at -> ${formatSavedAt(timestamp)}` },
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
        summary: "Restore requested, but there was no saved snapshot.",
        renderTraceHints: [{ name: "EmojiReactionBoardApp", reason: "no snapshot available" }],
        patchSummaryHints: [{ type: "TEXT", target: "last-action", summary: "restore noop" }],
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
      summary: "Restored the latest saved snapshot into the live state.",
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: "live state replaced from snapshot" },
        { name: "MetricsCards", reason: "derived metrics recalculated" },
      ],
      patchSummaryHints: [
        { type: "REPLACE", target: "recent-activity", summary: "recent activity replaced from save" },
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
      summary: "Reset the live board while keeping the saved snapshot untouched.",
      renderTraceHints: [
        { name: "EmojiReactionBoardApp", reason: "live votes reset to zero" },
        { name: "RecentActivity", reason: "history cleared" },
      ],
      patchSummaryHints: [
        { type: "TEXT", target: "metric-total", summary: "Total votes -> 0" },
      ],
    });

    applyLiveState({
      ...createEmptyLiveState(),
      lastAction: nextAction,
    });
  }

  return h(
    "div",
    { className: "min-h-screen" },
    h(TopNavBar),
    h(
      "div",
      { className: "flex pt-20" },
      h(
        "main",
        { className: "w-full md:w-[calc(100%-20rem)] px-8 md:px-16 py-12", "data-role": "board-main" },
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
          className:
            "hidden md:flex fixed right-0 top-0 h-full w-80 border-l border-[#b2ccc0]/15 bg-[#e9f7ef] flex-col gap-6 p-8 overflow-y-auto",
        },
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
    h("div", { className: "font-['Archivo_Black'] text-2xl tracking-tighter text-[#121e19]" }, "ReactRuntime"),
    h(
      "nav",
      { className: "hidden md:flex items-center gap-8 font-['Plus_Jakarta_Sans'] font-medium tracking-tight" },
      h(
        "a",
        {
          className: "text-[#006c46] font-bold border-b-2 border-[#006c46] pb-1 hover:scale-105 transition-transform duration-200",
          href: "#",
        },
        "Docs",
      ),
      h(
        "a",
        {
          className: "text-[#121e19]/60 hover:scale-105 transition-transform duration-200",
          href: "#",
        },
        "Examples",
      ),
      h(
        "a",
        {
          className: "text-[#121e19]/60 hover:scale-105 transition-transform duration-200",
          href: "#",
        },
        "GitHub",
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
      h("span", { className: "font-label text-xs tracking-widest uppercase text-outline" }, "Total Votes"),
      h(
        "div",
        { className: "flex items-baseline gap-2" },
        h("span", { className: "text-6xl font-headline text-on-background" }, formatNumber(totalVotes)),
        h("span", { className: "text-primary font-bold" }, topReaction ? `${topReaction.emoji}` : "Ready"),
      ),
    ),
    h(
      "div",
      {
        className: "bg-primary-container p-10 rounded-xl flex flex-col justify-between aspect-square md:aspect-auto",
        "data-role": "metric-leader",
      },
      h("span", { className: "font-label text-xs tracking-widest uppercase text-on-primary-container" }, "Current Leader"),
      topReaction
        ? h(
            "div",
            { className: "flex items-center gap-4" },
            h("span", { className: "text-7xl" }, topReaction.emoji),
            h(
              "div",
              {},
              h("span", { className: "block font-headline text-2xl text-on-primary-container" }, topReaction.label),
              h("span", { className: "text-on-primary-container opacity-70" }, `${topReaction.votes} Votes`),
            ),
          )
        : h(
            "div",
            { className: "flex items-center gap-4" },
            h("span", { className: "text-7xl" }, "🫥"),
            h(
              "div",
              {},
              h("span", { className: "block font-headline text-2xl text-on-primary-container" }, "No Leader"),
              h("span", { className: "text-on-primary-container opacity-70" }, "Vote to start the board"),
            ),
          ),
    ),
    h(
      "div",
      {
        className: "bg-secondary-container p-10 rounded-xl flex flex-col justify-between aspect-square md:aspect-auto",
        "data-role": "metric-percentage",
      },
      h("span", { className: "font-label text-xs tracking-widest uppercase text-on-secondary-container" }, "Lead Percentage"),
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
        h("h2", { className: "font-headline text-3xl mb-2" }, "Emoji Board"),
        h("p", { className: "text-on-surface-variant" }, "Click to dispatch a reactive action to the root store."),
      ),
      h(
        "div",
        { className: "bg-surface-container-highest px-4 py-2 rounded-full flex gap-2" },
        h("span", { className: "material-symbols-outlined text-primary", "data-icon": "filter_list" }, "filter_list"),
        h("span", { className: "font-label text-xs font-bold self-center" }, "ALL SYMBOLS"),
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
              "aria-label": `${emoji.label} reaction`,
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
  const peakLabel = topReaction ? `${topReaction.emoji} Peak` : "No Peak";
  const trendingLabel = trendingReaction ? `${trendingReaction.emoji} Trending` : "Waiting";

  return h(
    "div",
    { className: "flex flex-col gap-6" },
    h("h3", { className: "font-headline text-2xl" }, "Reaction Intensity"),
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
                entry.guestName,
                h("span", { className: "text-outline" }, " reacted with "),
                entry.emoji,
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
              h("p", { className: "text-sm font-medium" }, "No reactions yet"),
              h("p", { className: "text-xs text-outline" }, "Tap any emoji to start the feed."),
            ),
          ),
        ];

  return h(
    "div",
    { className: "flex flex-col gap-6" },
    h("h3", { className: "font-headline text-2xl" }, "Recent Activity"),
    h("div", { className: "space-y-4", "data-role": "recent-activity" }, activityItems),
  );
}

function RightRailHost() {
  return h(
    "div",
    { className: "mt-20" },
    h(
      "div",
      { className: "flex items-center gap-3 mb-6" },
      h(
        "div",
        { className: "w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-lg" },
        "⚙️",
      ),
      h(
        "div",
        {},
        h("h4", { className: "font-['Archivo_Black'] text-lg text-[#121e19]" }, "Live Monitor"),
        h("p", { className: "text-[10px] font-['Plus_Jakarta_Sans'] font-bold tracking-widest uppercase text-[#006c46]" }, "panel mount reserved"),
      ),
    ),
    h("div", { "data-panel-root": "", className: "min-h-[18rem]" }),
  );
}

function SidebarActionCard({ lastActionJson }) {
  return h(
    "div",
    {},
    h("label", { className: "font-label text-[10px] tracking-[0.2em] uppercase text-outline mb-3 block" }, "Last Action"),
    h(
      "div",
      {
        className: "bg-[#121e19] text-[#4dffb2] p-4 rounded-lg font-mono text-xs overflow-x-auto",
        "data-role": "last-action",
      },
      h("pre", {}, lastActionJson),
    ),
  );
}

function SidebarPersistenceControls({ savedAtLabel, onSave, onRestore, onReset }) {
  return h(
    "div",
    { className: "mt-2 pt-8 border-t border-outline-variant/20 flex flex-col gap-3" },
    h(
      "p",
      { className: "text-[10px] font-label tracking-[0.2em] uppercase text-outline mb-1", "data-role": "saved-at" },
      `Saved at ${savedAtLabel}`,
    ),
    h(
      "button",
      {
        type: "button",
        className: "w-full py-3 bg-on-background text-surface rounded-full text-xs font-bold font-label tracking-widest flex items-center justify-center gap-2 hover:opacity-90",
        onClick: onSave,
        "data-action": "save",
      },
      h("span", { className: "material-symbols-outlined text-sm", "data-icon": "save" }, "save"),
      "SAVE TO LOCALSTORAGE",
    ),
    h(
      "div",
      { className: "grid grid-cols-2 gap-3" },
      h(
        "button",
        {
          type: "button",
          className: "py-3 bg-surface-container-highest text-on-surface rounded-full text-[10px] font-bold font-label tracking-widest flex items-center justify-center gap-1 hover:bg-outline-variant/30 transition-colors",
          onClick: onRestore,
          "data-action": "restore",
        },
        h("span", { className: "material-symbols-outlined text-sm", "data-icon": "restore" }, "restore"),
        "RESTORE",
      ),
      h(
        "button",
        {
          type: "button",
          className: "py-3 bg-error-container text-on-error-container rounded-full text-[10px] font-bold font-label tracking-widest flex items-center justify-center gap-1 hover:opacity-80 transition-colors",
          onClick: onReset,
          "data-action": "reset",
        },
        h("span", { className: "material-symbols-outlined text-sm", "data-icon": "delete_sweep" }, "delete_sweep"),
        "RESET",
      ),
    ),
  );
}

function Footer() {
  return h(
    "footer",
    { className: "w-full border-t border-[#b2ccc0]/15 py-10 bg-[#effdf4] flex flex-col items-center justify-center gap-4 md:pr-80" },
    h(
      "div",
      { className: "flex gap-8" },
      h("a", { className: "font-['Plus_Jakarta_Sans'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19] hover:opacity-100 transition-opacity", href: "#" }, "Privacy"),
      h("a", { className: "font-['Plus_Jakarta_Sans'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19] hover:opacity-100 transition-opacity", href: "#" }, "Terms"),
      h("a", { className: "font-['Plus_Jakarta_Sans'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19] hover:opacity-100 transition-opacity", href: "#" }, "Changelog"),
    ),
    h("p", { className: "font-['Plus_Jakarta_Sans'] text-xs font-medium tracking-wider uppercase opacity-50 text-[#121e19]" }, "© 2024 Lab Runtime. All rights reserved."),
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
  return new Intl.NumberFormat("en-US").format(value);
}
