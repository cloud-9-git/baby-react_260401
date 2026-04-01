export const STORAGE_KEY = "baby-react-emoji-board";
export const STORAGE_VERSION = 1;
export const MAX_RECENT_REACTIONS = 6;
export const MAX_VISIBLE_RECENT_REACTIONS = 3;

export const EMOJI_CATALOG = [
  { id: "grin", emoji: "😀", label: "싱긋" },
  { id: "fire", emoji: "🔥", label: "불꽃" },
  { id: "rocket", emoji: "🚀", label: "로켓" },
  { id: "sparkles", emoji: "✨", label: "반짝" },
  { id: "party", emoji: "🎉", label: "파티" },
  { id: "heart", emoji: "❤️", label: "하트" },
  { id: "pizza", emoji: "🍕", label: "피자" },
  { id: "rainbow", emoji: "🌈", label: "무지개" },
  { id: "avocado", emoji: "🥑", label: "아보카도" },
  { id: "idea", emoji: "💡", label: "아이디어" },
  { id: "unicorn", emoji: "🦄", label: "유니콘" },
  { id: "wave", emoji: "🌊", label: "파도" },
  { id: "donut", emoji: "🍩", label: "도넛" },
  { id: "pixel", emoji: "👾", label: "픽셀" },
  { id: "balloon", emoji: "🎈", label: "풍선" },
  { id: "lab", emoji: "🧪", label: "실험실" },
  { id: "genome", emoji: "🧬", label: "게놈" },
  { id: "robot", emoji: "🤖", label: "로봇" },
  { id: "earth", emoji: "🌍", label: "지구" },
  { id: "gem", emoji: "💎", label: "보석" },
];

export const GUEST_ROSTER = [
  { name: "김하늘", initials: "하", avatarClassName: "bg-tertiary-fixed text-on-tertiary-fixed" },
  { name: "이서윤", initials: "서", avatarClassName: "bg-secondary-fixed text-on-secondary-fixed" },
  { name: "박준호", initials: "준", avatarClassName: "bg-primary-fixed text-on-primary-fixed" },
  { name: "박미나", initials: "미", avatarClassName: "bg-primary-container text-on-primary-container" },
  { name: "김이든", initials: "든", avatarClassName: "bg-surface-container-highest text-on-surface" },
  { name: "이소라", initials: "소", avatarClassName: "bg-secondary-container text-on-secondary-container" },
];

export const HERO_COPY = {
  eyebrow: "베이비 리액트 런타임 데모",
  titlePrefix: "가볍게",
  titleAccent: "반응하고.",
  titleSuffix: "즐겁게 상태를 보여줘요.",
  description:
    "루트 상태, 파생 지표, props만 받는 자식 컴포넌트를 한 화면에서 보여주는 React 스타일 런타임 데모입니다.",
};
