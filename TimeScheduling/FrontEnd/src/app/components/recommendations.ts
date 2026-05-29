import {
  SLOTS_PER_DAY,
  fmtDateShort,
  slotLabel,
  type DomainType,
  type Member,
  type Submission,
} from "../types";

export type RecommendationType =
  | "MAX_ATTENDANCE"
  | "EQUAL_DISTRIBUTION"
  | "MAX_CONTINUITY";

export type Recommendation = {
  kind: "attendance" | "balanced" | "continuity";
  recommendationType: RecommendationType;
  rank: number; // 1~3
  title: string;
  icon: string;
  col: number; // index into session.dates
  date: string;
  start: number;
  end: number;
  attendeeCount: number;
  totalCount: number;
  attendanceRate: number; // %
  assignedMembers: string[];
  missingMembers: string[];
  description: string;
};

function fmtCol(date: string) {
  const f = fmtDateShort(date);
  return `${f.top}(${f.bot})`;
}

function attendeesForRange(
  submissions: Submission[],
  memberById: Map<number, Member>,
  col: number,
  start: number,
  end: number,
): { assigned: string[]; missing: string[] } {
  const assigned: string[] = [];
  const missing: string[] = [];
  for (const s of submissions) {
    const m = memberById.get(s.memberId);
    if (!m) continue;
    const day = s.slots[col];
    let ok = !!day;
    if (day) {
      for (let i = start; i < end; i++) {
        if (!day[i]) { ok = false; break; }
      }
    }
    (ok ? assigned : missing).push(m.name);
  }
  // also include members who didn't submit at all → missing
  for (const m of memberById.values()) {
    if (!submissions.some((s) => s.memberId === m.memberId)) {
      missing.push(m.name);
    }
  }
  return { assigned, missing };
}

export function computeRecommendations(
  dates: string[],
  members: Member[],
  submissions: Submission[],
  domainType: DomainType,
): Recommendation[] {
  const total = members.length;
  if (submissions.length === 0 || dates.length === 0 || total === 0) return [];

  const memberById = new Map(members.map((m) => [m.memberId, m]));
  const requiredSubs = submissions.filter(
    (s) => memberById.get(s.memberId)?.isMandatory,
  );

  const counts: number[][] = Array.from({ length: dates.length }, () =>
    new Array(SLOTS_PER_DAY).fill(0),
  );
  for (let col = 0; col < dates.length; col++) {
    for (let i = 0; i < SLOTS_PER_DAY; i++) {
      const requiredOk = requiredSubs.every((s) => s.slots[col]?.[i]);
      if (!requiredOk) {
        counts[col][i] = -1;
        continue;
      }
      for (const s of submissions) if (s.slots[col]?.[i]) counts[col][i]++;
    }
  }

  let best = { col: 0, slot: 0, n: -1 };
  for (let col = 0; col < dates.length; col++) {
    for (let i = 0; i < SLOTS_PER_DAY; i++) {
      const n = counts[col][i];
      if (n < 0) continue;
      if (n > best.n) best = { col, slot: i, n };
    }
  }

  if (best.n <= 0) return [];

  const draft: Omit<Recommendation, "rank">[] = [];

  {
    const { assigned, missing } = attendeesForRange(
      submissions,
      memberById,
      best.col,
      best.slot,
      best.slot + 1,
    );
    draft.push({
      kind: "attendance",
      recommendationType: "MAX_ATTENDANCE",
      icon: "🏆",
      title: "최대 참석률",
      col: best.col,
      date: dates[best.col],
      start: best.slot,
      end: best.slot + 1,
      attendeeCount: best.n,
      totalCount: total,
      attendanceRate: Math.round((best.n / total) * 100),
      assignedMembers: assigned,
      missingMembers: missing,
      description: `${fmtCol(dates[best.col])} ${slotLabel(best.slot)}에 최대 인원이 참석할 수 있는 시간대입니다.`,
    });
  }

  const threshold = Math.max(1, Math.ceil(submissions.length * 0.6));
  let cont = { col: 0, start: 0, end: 0, n: 0 };
  for (let col = 0; col < dates.length; col++) {
    let runStart = -1;
    let runMin = Infinity;
    for (let i = 0; i <= SLOTS_PER_DAY; i++) {
      const ok = i < SLOTS_PER_DAY && counts[col][i] >= threshold;
      if (ok) {
        if (runStart === -1) {
          runStart = i;
          runMin = counts[col][i];
        } else {
          runMin = Math.min(runMin, counts[col][i]);
        }
      } else {
        if (runStart !== -1) {
          const len = i - runStart;
          if (len > cont.end - cont.start) {
            cont = { col, start: runStart, end: i, n: runMin };
          }
          runStart = -1;
          runMin = Infinity;
        }
      }
    }
  }

  if (cont.end > cont.start) {
    const hrs = ((cont.end - cont.start) * 30) / 60;
    const { assigned, missing } = attendeesForRange(
      submissions,
      memberById,
      cont.col,
      cont.start,
      cont.end,
    );
    draft.push({
      kind: "continuity",
      recommendationType: "MAX_CONTINUITY",
      icon: "⏱️",
      title: "최대 연속 시간",
      col: cont.col,
      date: dates[cont.col],
      start: cont.start,
      end: cont.end,
      attendeeCount: cont.n,
      totalCount: total,
      attendanceRate: Math.round((cont.n / total) * 100),
      assignedMembers: assigned,
      missingMembers: missing,
      description: `${fmtCol(dates[cont.col])} ${slotLabel(cont.start)}부터 ${hrs}시간 동안 연속 참석 가능한 구간입니다.`,
    });
  }

  // EQUAL_DISTRIBUTION - 균등 분배 (목표 인원과 가장 가까운 슬롯)
  {
    const target = Math.ceil(submissions.length / 2);
    let bal = { col: 0, slot: 0, diff: Infinity, n: 0 };
    for (let col = 0; col < dates.length; col++) {
      for (let i = 0; i < SLOTS_PER_DAY; i++) {
        const n = counts[col][i];
        if (n <= 0) continue;
        const diff = Math.abs(n - target);
        if (diff < bal.diff) bal = { col, slot: i, diff, n };
      }
    }
    if (bal.n > 0) {
      const { assigned, missing } = attendeesForRange(
        submissions,
        memberById,
        bal.col,
        bal.slot,
        bal.slot + 1,
      );
      draft.push({
        kind: "balanced",
        recommendationType: "EQUAL_DISTRIBUTION",
        icon: "⚖️",
        title: "균등 분배",
        col: bal.col,
        date: dates[bal.col],
        start: bal.slot,
        end: bal.slot + 1,
        attendeeCount: bal.n,
        totalCount: total,
        attendanceRate: Math.round((bal.n / total) * 100),
        assignedMembers: assigned,
        missingMembers: missing,
        description: `${fmtCol(dates[bal.col])} ${slotLabel(bal.slot)}에 목표 인원(${target}명)과 가장 가까운 균형잡힌 배치입니다.`,
      });
    }
  }

  // 도메인이 MEETING이고 균등분배가 마지막에 위치하도록 sort 우선순위: 참석률 desc, 그 다음 kind
  draft.sort((a, b) => b.attendanceRate - a.attendanceRate);

  return draft.slice(0, 3).map((r, i) => ({ ...r, rank: i + 1 }));
}
