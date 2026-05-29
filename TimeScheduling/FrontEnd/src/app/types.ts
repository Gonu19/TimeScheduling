export type DomainType = "MEETING" | "WORK";
export type SessionStatus = "OPEN" | "CONFIRMED";

export type Member = {
  memberId: number;
  name: string;
  role: string;
  isMandatory: boolean;
  hasSubmitted: boolean;
};

export type Session = {
  id: string; // UUID v4
  adminKey?: string; // Admin UUID for verifying dashboard actions
  title: string;
  domainType: DomainType;
  status: SessionStatus;
  members: Member[];
  dates: string[]; // candidate ISO dates (YYYY-MM-DD), columns in the grid
  createdAt: number;
  expiresAt?: number;
};

// 0 = Monday ... 6 = Sunday (matches API bitmask index)
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};
export type WeekdayKey = (typeof WEEKDAYS)[number];

export type Submission = {
  memberId: number;
  // 7 days × 48 slots (30-min). slots[weekdayIdx][slot]
  slots: boolean[][];
  submittedAt: number;
};

export const ROLES = ["발표자", "진행자", "기록자", "참여자", "옵저버"] as const;
export type Role = (typeof ROLES)[number];

export type AdjustedSlot = {
  time: string; // "HH:mm"
  removed?: string;
  added?: string;
};

export type EditRecord = {
  at: number;
  reason: string;
  // Legacy schedule-shift fields (optional)
  from?: { date: string; start: number; end: number };
  to?: { date: string; start: number; end: number };
  // API 4.2 spec: per-slot member adjustments
  adjustedSlots?: AdjustedSlot[];
};

export type ConfirmedSlot = {
  date: string; // ISO date string
  start: number;
  end: number;
  title: string;
  description: string;
  confirmedAt: number;
  assignments?: Record<number, Role>; // memberId -> role
  edits?: EditRecord[];
};

export type RecentSession = {
  id: string;
  title: string;
  domainType: string;
  memberCount: number;
  submittedCount: number;
  confirmedDate?: string;
  updatedAt: number;
};

const STORAGE_KEY = "schedulr.recent.v2";

export function loadAllStored(): RecentSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentSession[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveStored(entry: RecentSession) {
  const all = loadAllStored().filter((s) => s.id !== entry.id);
  all.unshift({ ...entry, updatedAt: Date.now() });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 20)));
  } catch {
    // ignore quota errors
  }
}

export function deleteStored(id: string) {
  const all = loadAllStored().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export const SLOTS_PER_DAY = 48;

export function slotLabel(i: number): string {
  if (i === SLOTS_PER_DAY) return "24:00";
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}

export function emptyDay(): boolean[] {
  return new Array(SLOTS_PER_DAY).fill(false);
}

export function emptyWeek(): boolean[][] {
  return Array.from({ length: 7 }, emptyDay);
}

export function weekdayFullLabel(key: WeekdayKey): string {
  return `${WEEKDAY_LABELS[key]}요일`;
}

export function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
}

export function fmtDateShort(iso: string): { top: string; bot: string } {
  const d = new Date(iso);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return { top: `${d.getMonth() + 1}/${d.getDate()}`, bot: wd };
}

export function copyToClipboard(text: string, onSuccess: () => void) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopyTextToClipboard(text, onSuccess);
    });
  } else {
    fallbackCopyTextToClipboard(text, onSuccess);
  }
}

function fallbackCopyTextToClipboard(text: string, onSuccess: () => void) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) onSuccess();
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}
