import {
  EMOJI_CATALOG,
  GUEST_ROSTER,
  MAX_RECENT_REACTIONS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from "./data.js";

export function createEmptyVotes() {
  return Object.fromEntries(EMOJI_CATALOG.map(({ id }) => [id, 0]));
}

export function createEmptyLiveState() {
  return {
    votes: createEmptyVotes(),
    selectedEmoji: null,
    recentReactions: [],
    savedAt: null,
    lastAction: null,
  };
}

export function serializeSnapshot(liveState) {
  return {
    version: STORAGE_VERSION,
    votes: sanitizeVotes(liveState.votes),
    selectedEmoji: sanitizeSelectedEmoji(liveState.selectedEmoji),
    recentReactions: sanitizeRecentReactions(liveState.recentReactions),
    savedAt: sanitizeTimestamp(liveState.savedAt),
    lastAction: sanitizeAction(liveState.lastAction),
  };
}

export function loadSavedSnapshot() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return normalizeSnapshot(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function persistSnapshot(snapshot) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function selectTotalVotes(votes) {
  return EMOJI_CATALOG.reduce((total, emoji) => total + (votes?.[emoji.id] ?? 0), 0);
}

export function selectSortedResults(votes) {
  return [...EMOJI_CATALOG]
    .map((emoji) => ({
      ...emoji,
      votes: votes?.[emoji.id] ?? 0,
    }))
    .sort((left, right) => {
      if (right.votes !== left.votes) {
        return right.votes - left.votes;
      }

      return EMOJI_CATALOG.findIndex(({ id }) => id === left.id) -
        EMOJI_CATALOG.findIndex(({ id }) => id === right.id);
    });
}

export function selectTopReaction(votes) {
  const totalVotes = selectTotalVotes(votes);

  if (totalVotes === 0) {
    return null;
  }

  return selectSortedResults(votes)[0] ?? null;
}

export function selectTopPercentage(votes) {
  const topReaction = selectTopReaction(votes);
  const totalVotes = selectTotalVotes(votes);

  if (!topReaction || totalVotes === 0) {
    return 0;
  }

  return Number(((topReaction.votes / totalVotes) * 100).toFixed(1));
}

export function createReactionEntry(emoji, totalVotesBefore) {
  const guest = GUEST_ROSTER[totalVotesBefore % GUEST_ROSTER.length];
  const timestamp = Date.now();

  return {
    id: `reaction-${timestamp}-${emoji.id}`,
    emojiId: emoji.id,
    emoji: emoji.emoji,
    label: emoji.label,
    guestName: guest.name,
    guestInitials: guest.initials,
    guestAvatarClassName: guest.avatarClassName,
    timestamp,
  };
}

export function formatSavedAt(timestamp) {
  if (!timestamp) {
    return "Not saved yet";
  }

  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "just now";
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (elapsedSeconds < 60) {
    return "just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return {
    version: STORAGE_VERSION,
    votes: sanitizeVotes(snapshot.votes),
    selectedEmoji: sanitizeSelectedEmoji(snapshot.selectedEmoji),
    recentReactions: sanitizeRecentReactions(snapshot.recentReactions),
    savedAt: sanitizeTimestamp(snapshot.savedAt),
    lastAction: sanitizeAction(snapshot.lastAction),
  };
}

function sanitizeVotes(votes) {
  const normalizedVotes = createEmptyVotes();

  if (!votes || typeof votes !== "object") {
    return normalizedVotes;
  }

  for (const emoji of EMOJI_CATALOG) {
    const value = Number(votes[emoji.id]);
    normalizedVotes[emoji.id] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  return normalizedVotes;
}

function sanitizeSelectedEmoji(selectedEmoji) {
  if (typeof selectedEmoji !== "string") {
    return null;
  }

  return EMOJI_CATALOG.some(({ id }) => id === selectedEmoji) ? selectedEmoji : null;
}

function sanitizeRecentReactions(recentReactions) {
  if (!Array.isArray(recentReactions)) {
    return [];
  }

  return recentReactions
    .map((entry) => sanitizeRecentReaction(entry))
    .filter(Boolean)
    .slice(0, MAX_RECENT_REACTIONS);
}

function sanitizeRecentReaction(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const emoji = EMOJI_CATALOG.find(({ id }) => id === entry.emojiId);

  if (!emoji) {
    return null;
  }

  return {
    id: typeof entry.id === "string" ? entry.id : `reaction-${Date.now()}-${emoji.id}`,
    emojiId: emoji.id,
    emoji: typeof entry.emoji === "string" ? entry.emoji : emoji.emoji,
    label: typeof entry.label === "string" ? entry.label : emoji.label,
    guestName: typeof entry.guestName === "string" ? entry.guestName : "Guest User",
    guestInitials: typeof entry.guestInitials === "string" ? entry.guestInitials : "GU",
    guestAvatarClassName:
      typeof entry.guestAvatarClassName === "string"
        ? entry.guestAvatarClassName
        : "bg-surface-container-highest text-on-surface",
    timestamp: sanitizeTimestamp(entry.timestamp),
  };
}

function sanitizeAction(action) {
  if (!action || typeof action !== "object") {
    return null;
  }

  const allowedTypes = new Set(["react", "save", "restore", "reset"]);

  if (!allowedTypes.has(action.type)) {
    return null;
  }

  return {
    type: action.type,
    payload: action.payload && typeof action.payload === "object" ? action.payload : {},
    timestamp: sanitizeTimestamp(action.timestamp),
    summary: typeof action.summary === "string" ? action.summary : "",
    renderTraceHints: sanitizeHints(action.renderTraceHints),
    patchSummaryHints: sanitizeHints(action.patchSummaryHints),
  };
}

function sanitizeHints(hints) {
  if (!Array.isArray(hints)) {
    return [];
  }

  return hints
    .filter((hint) => hint && typeof hint === "object")
    .map((hint) => ({
      name: typeof hint.name === "string" ? hint.name : undefined,
      reason: typeof hint.reason === "string" ? hint.reason : "",
      type: typeof hint.type === "string" ? hint.type : undefined,
      target: typeof hint.target === "string" ? hint.target : undefined,
      summary: typeof hint.summary === "string" ? hint.summary : "",
    }));
}

function sanitizeTimestamp(timestamp) {
  const value = Number(timestamp);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}
