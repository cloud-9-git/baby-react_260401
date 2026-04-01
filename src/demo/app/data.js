export const STORAGE_KEY = "baby-react-emoji-board";
export const STORAGE_VERSION = 1;
export const MAX_RECENT_REACTIONS = 6;
export const MAX_VISIBLE_RECENT_REACTIONS = 3;

export const EMOJI_CATALOG = [
  { id: "grin", emoji: "😀", label: "Grin" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "sparkles", emoji: "✨", label: "Sparkles" },
  { id: "party", emoji: "🎉", label: "Party" },
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "pizza", emoji: "🍕", label: "Pizza" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "avocado", emoji: "🥑", label: "Avocado" },
  { id: "idea", emoji: "💡", label: "Idea" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn" },
  { id: "wave", emoji: "🌊", label: "Wave" },
  { id: "donut", emoji: "🍩", label: "Donut" },
  { id: "pixel", emoji: "👾", label: "Pixel" },
  { id: "balloon", emoji: "🎈", label: "Balloon" },
  { id: "lab", emoji: "🧪", label: "Lab" },
  { id: "genome", emoji: "🧬", label: "Genome" },
  { id: "robot", emoji: "🤖", label: "Robot" },
  { id: "earth", emoji: "🌍", label: "Earth" },
  { id: "gem", emoji: "💎", label: "Gem" },
];

export const GUEST_ROSTER = [
  { name: "John Doe", initials: "JD", avatarClassName: "bg-tertiary-fixed text-on-tertiary-fixed" },
  { name: "Alice Smith", initials: "AS", avatarClassName: "bg-secondary-fixed text-on-secondary-fixed" },
  { name: "Bob King", initials: "BK", avatarClassName: "bg-primary-fixed text-on-primary-fixed" },
  { name: "Mina Park", initials: "MP", avatarClassName: "bg-primary-container text-on-primary-container" },
  { name: "Ethan Kim", initials: "EK", avatarClassName: "bg-surface-container-highest text-on-surface" },
  { name: "Sora Lee", initials: "SL", avatarClassName: "bg-secondary-container text-on-secondary-container" },
];

export const HERO_COPY = {
  eyebrow: "Baby React Runtime Demo",
  titlePrefix: "Simple",
  titleAccent: "Reactivity.",
  titleSuffix: "Beautiful State.",
  description:
    "A custom React-like runtime designed to show root state, derived metrics, and props-only child components in one playful reaction board.",
};
