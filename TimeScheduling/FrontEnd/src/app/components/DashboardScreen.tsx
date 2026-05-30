import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { AlertTriangle, RotateCw, Check, CalendarCheck, Star, Pencil, History, Link as LinkIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { HeatmapGrid } from "./HeatmapGrid";
import type { Column } from "./TimeGrid";
import { SessionLinkModal } from "./SessionLinkModal";
import { sessionApi } from "../../api/sessionApi";
import { type Recommendation } from "./recommendations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  ROLES,
  fmtDateLong,
  fmtDateShort,
  slotLabel,
  type ConfirmedSlot,
  type Member,
  type Role,
  type Session,
  type Submission,
} from "../types";

type Props = {
  session: Session;
  submissions: Submission[];
  confirmed: ConfirmedSlot | null;
  onConfirm: (c: ConfirmedSlot | null) => void;
  onUpdateMembers: (next: Member[]) => void;
  onBack: () => void;
  isLoading?: boolean;
  isAdminVerified: boolean;
  setIsAdminVerified: (b: boolean) => void;
  adminToken?: string | null;
  onAdminVerify?: (token: string) => void;
  onFetchSession?: () => Promise<void> | void;
};

export function DashboardScreen({
  session,
  submissions,
  confirmed,
  onConfirm,
  onUpdateMembers,
  onBack,
  isLoading,
  isAdminVerified,
  setIsAdminVerified,
  adminToken,
  onAdminVerify,
  onFetchSession,
}: Props) {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [selectedUserSub, setSelectedUserSub] = useState<Submission | null>(null);

  const navigate = useNavigate();
  const [isChaining, setIsChaining] = useState(false);

  const handleChainSession = async () => {
    if (!confirmed) return;
    setIsChaining(true);
    try {
      let startDateStr = new Date().toISOString().split("T")[0];
      
      if (session.domainType === "WORK" && session.dates && session.dates.length > 0) {
        const start = new Date(session.dates[0]);
        start.setDate(start.getDate() + 7);
        startDateStr = start.toISOString().split("T")[0];
      } else {
        if (confirmed.confirmedBlocks && confirmed.confirmedBlocks.length > 0) {
          startDateStr = confirmed.confirmedBlocks[0].startTime.split("T")[0];
        }
      }

      // Title cleanup: remove existing " (YYYY-MM-DD 이후)" to prevent duplication
      const cleanTitle = session.title.replace(/\s*\(\d{4}-\d{2}-\d{2}\s*이후\)/g, "");
      const newTitle = `${cleanTitle} (${startDateStr} 이후)`;

      const payload: any = {
        title: newTitle,
        domainType: session.domainType,
        startDate: startDateStr,
        members: session.members.map(m => ({
          name: m.name,
          role: m.role || "참여자",
          isMandatory: m.isMandatory
        }))
      };

      if (session.domainType === "WORK" && session.requirementsJson) {
        payload.requirementsJson = session.requirementsJson;
      }

      const res = await sessionApi.createSession(payload);
      window.prompt("새로운 세션이 생성되었습니다! 아래 관리자 UUID를 복사해 두세요.", res.adminToken);
      toast.success("새로운 일정이 생성되었습니다.");
      navigate(`/${res.sessionId}`);
    } catch (err) {
      console.error(err);
      toast.error("다음 일정 생성에 실패했습니다.");
    } finally {
      setIsChaining(false);
    }
  };

  const handleVerifyAdmin = async () => {
    try {
      const isValid = await sessionApi.verifyAdmin(session.id, adminKeyInput.trim());
      if (isValid) {
        setIsAdminVerified(true);
        if (onAdminVerify) onAdminVerify(adminKeyInput.trim());
        setAuthError("");
      } else {
        setAuthError("관리자 UUID가 일치하지 않습니다.");
      }
    } catch (e) {
      setAuthError("인증 중 오류가 발생했습니다.");
    }
  };

  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<Recommendation | null>(null);
  const [conflict, setConflict] = useState(false);
  const [version, setVersion] = useState(0);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  
  // Time Adjustment UI States
  const [timeAdjustModalOpen, setTimeAdjustModalOpen] = useState(false);
  const [editingRecRank, setEditingRecRank] = useState<number | null>(null);
  const [editingBlocks, setEditingBlocks] = useState<any[]>([]);

  // 근무자별 총 근무 시간 계산 헬퍼 함수
  const calcTotalHours = (blocks: any[]) => {
    const hours: Record<string, { name: string; total: number; isMandatory: boolean }> = {};
    if (!blocks) return hours;
    blocks.forEach((tb) => {
      const start = new Date(tb.startTime).getTime();
      const end = new Date(tb.endTime).getTime();
      let diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours < 0) diffHours += 24; // 자정 넘김 처리

      const workers = tb.assignedWorkers || (tb as any).workers;
      if (workers) {
        workers.forEach((w: any) => {
          if (!hours[w.id || w.name]) {
            hours[w.id || w.name] = { name: w.name, total: 0, isMandatory: w.isMandatory };
          }
          hours[w.id || w.name].total += diffHours;
        });
      }
    });
    return hours;
  };

  const openTimeAdjust = (r: Recommendation) => {
    setEditingRecRank(r.rank);
    // 깊은 복사를 통해 로컬 상태를 초기화합니다.
    setEditingBlocks(r.timeBlocks ? JSON.parse(JSON.stringify(r.timeBlocks)) : []);
    setTimeAdjustModalOpen(true);
  };

  const handleTimeAdjustSubmit = () => {
    if (editingRecRank === null) return;

    // 시작 시간이 종료 시간보다 같거나 늦은 경우 차단
    for (const block of editingBlocks) {
      const startT = block.startTime?.split("T")[1]?.substring(0, 5);
      const endT = block.endTime?.split("T")[1]?.substring(0, 5);
      if (startT && endT && startT >= endT) {
        toast.error("시작 시간이 종료 시간보다 같거나 늦을 수 없습니다.");
        return;
      }
    }

    setRecs((prev) =>
      prev.map((r) => {
        if (r.rank === editingRecRank) {
          return {
            ...r,
            timeBlocks: editingBlocks,
            isManuallyAdjusted: true,
          };
        }
        return r;
      })
    );
    setTimeAdjustModalOpen(false);
    toast.success("시간이 조정되었습니다. 최종 확정하기 버튼을 눌러 저장하세요.");
  };

  const updateEditingBlockTime = (blockIdx: number, type: "start" | "end", timeStr: string) => {
    setEditingBlocks((prev) =>
      prev.map((tb, idx) => {
        if (idx !== blockIdx) return tb;
        const currentIso = type === "start" ? tb.startTime : tb.endTime;
        const [datePart] = currentIso.split("T");
        const newIso = `${datePart}T${timeStr}:00`;
        return {
          ...tb,
          [type === "start" ? "startTime" : "endTime"]: newIso,
        };
      })
    );
  };

  const memberById = useMemo(
    () => new Map(session.members.map((m) => [m.memberId, m])),
    [session.members],
  );

  const columns: Column[] = session.dates.map((d) => {
    const f = fmtDateShort(d);
    return { key: d, top: f.top, bot: f.bot };
  });


  const setAssignment = (memberId: number, role: Role | "none") => {
    if (!confirmed) return;
    const assignments = { ...(confirmed.assignments ?? {}) };
    if (role === "none") delete assignments[memberId];
    else assignments[memberId] = role;
    onConfirm({ ...confirmed, assignments });
  };

  const parseTimeBlock = (tb: any, dates: string[]) => {
    if (!tb || !tb.startTime || !tb.endTime) return null;
    const dStr = tb.startTime.split("T")[0];
    const col = dates.indexOf(dStr);
    if (col === -1) return null;
    const sStr = tb.startTime.split("T")[1].substring(0, 5);
    const eStr = tb.endTime.split("T")[1].substring(0, 5);
    const timeToSlot = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 2 + (m >= 30 ? 1 : 0);
    };
    return { col, start: timeToSlot(sStr), end: eStr === "00:00" ? 48 : timeToSlot(eStr) };
  };

  const attendeesAtConfirmed = useMemo(() => {
    if (!confirmed) return [];
    
    let hasAssignedWorkers = false;
    const assignedIds = new Set<number>();
    
    if (confirmed.confirmedBlocks) {
      for (const block of confirmed.confirmedBlocks) {
        if (block.assignedWorkers && block.assignedWorkers.length > 0) {
          hasAssignedWorkers = true;
          for (const worker of block.assignedWorkers) {
            const member = session.members.find(m => m.participantId === worker.id || m.name === worker.name);
            if (member) {
              assignedIds.add(member.memberId);
            }
          }
        }
      }
    }
    
    if (hasAssignedWorkers) {
      return Array.from(assignedIds).map(id => ({ memberId: id }));
    }

    return submissions.filter((s) => {
      if (!confirmed.confirmedBlocks) return false;
      for (const block of confirmed.confirmedBlocks) {
        const parsed = parseTimeBlock(block, session.dates);
        if (!parsed) continue;
        const day = s.slots[parsed.col];
        if (day) {
          for (let i = parsed.start; i < parsed.end; i++) {
            if (day[i]) return true;
          }
        }
      }
      return false;
    });
  }, [confirmed, submissions, session]);

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(false);
  const submissionsCount = submissions.length;

  const mandatoryIds = useMemo(
    () => session.members.filter((m) => m.isMandatory).map((m) => m.memberId),
    [session.members]
  );
  const mandatoryIdsStr = mandatoryIds.join(",");

  useEffect(() => {
    let active = true;
    const fetchRecs = async () => {
      setIsRecsLoading(true);
      try {
        let mapped: Recommendation[] = [];
        const allNames = session.members.map(m => m.name);
        
        if (session.domainType === "WORK") {
          const data = await sessionApi.getWorkRecommendations(session.id);
          if (!active) return;
          
          mapped = (data || []).map((r, i) => {
            const assignedWorkerObjs = new Map<string, boolean>();
            r.weeklyPlan.forEach(wp => {
              wp.assignedWorkers.forEach(w => {
                assignedWorkerObjs.set(w.name, w.isMandatory);
              });
            });
            const allAssignedNames = Array.from(assignedWorkerObjs.keys());
            const missing = allNames.filter((n: string) => !allAssignedNames.includes(n));
            const assignedDisplay = allAssignedNames.map(name => assignedWorkerObjs.get(name) ? `${name} ★` : name);
            
            return {
              kind: `work_${i}`,
              recommendationType: "WORK" as any,
              rank: r.rank || i + 1,
              title: `${i + 1}순위 추천안`,
              icon: i === 0 ? "🏆" : i === 1 ? "⏱️" : "⚖️",
              timeBlocks: r.weeklyPlan,
              attendeeCount: allAssignedNames.length,
              totalCount: session.members.length,
              attendanceRate: 100, // Hardcoded or parse r.totalCoverage
              attendanceRateStr: r.totalCoverage,
              assignedMembers: assignedDisplay,
              missingMembers: missing,
              description: "주간 근무 배정안입니다.",
              version: r.version
            } as Recommendation;
          });
        } else {
          const data = await sessionApi.getRecommendations(session.id);
          if (!active) return;

          mapped = (data || []).map((r, i) => {
            const kind = r.type === "MAX_ATTENDANCE" ? "attendance" :
              r.type === "MAX_CONTINUITY" ? "continuity" : "balanced";
            const title = r.type === "MAX_ATTENDANCE" ? "최대 참석률" :
              r.type === "MAX_CONTINUITY" ? "최대 연속 시간" : "균등 분배";
            const icon = r.type === "MAX_ATTENDANCE" ? "🏆" :
              r.type === "MAX_CONTINUITY" ? "⏱️" : "⚖️";
            
            const startStr = `${r.date}T${r.startTime}:00`;
            const endStr = `${r.date}T${r.endTime}:00`;
            const missing = allNames.filter((n: string) => !(r.attendees || []).includes(n));
            
            return {
              kind,
              recommendationType: r.type as any,
              rank: r.rank || i + 1,
              title,
              icon,
              timeBlocks: [{ startTime: startStr, endTime: endStr }],
              attendeeCount: r.attendeesCount || (r.attendees || []).length,
              totalCount: session.members.length,
              attendanceRate: Math.round(((r.attendeesCount || (r.attendees || []).length) / session.members.length) * 100) || 0,
              assignedMembers: r.attendees || [],
              missingMembers: missing,
              description: `${r.date} ${r.startTime}에 시작하는 추천 일정입니다.`,
              version: r.version
            } as Recommendation;
          });
        }

        setRecs(mapped);
      } catch (err) {
        console.error("추천안을 가져오지 못했습니다.", err);
      } finally {
        if (active) setIsRecsLoading(false);
      }
    };
    if (submissionsCount > 0) {
      fetchRecs();
    } else {
      setRecs([]);
    }
    return () => { active = false; };
  }, [session.id, submissionsCount, mandatoryIdsStr]);

  const expectedCount = session.members.length;
  const progress =
    expectedCount > 0 ? Math.min(100, Math.round((submissions.length / expectedCount) * 100)) : 0;

  const requiredCount = session.members.filter((m) => m.isMandatory).length;
  const hasAnyAvailability =
    submissions.length > 0 &&
    submissions.some((s) => s.slots.some((d) => d.some(Boolean)));
  const noFeasible = submissions.length > 0 && recs.length === 0;


  const tryConfirm = (r: Recommendation) => {
    if (Math.random() < 0.2 && submissions.length > 1) {
      setPendingConfirm(r);
      setConflict(true);
      return;
    }
    const assignments: Record<number, Role> = {};
    for (const s of submissions) {
      let canAttendAny = false;
      if (r.timeBlocks) {
        for (const block of r.timeBlocks) {
          const parsed = parseTimeBlock(block, session.dates);
          if (!parsed) continue;
          const day = s.slots[parsed.col];
          if (day) {
             for (let i = parsed.start; i < parsed.end; i++) {
                if (day[i]) { canAttendAny = true; break; }
             }
          }
          if (canAttendAny) break;
        }
      }
      if (canAttendAny) assignments[s.memberId] = "참여자";
    }

    const blocksWithWorkers = r.timeBlocks?.map(block => {
      let assignedWorkers: any[] = block.assignedWorkers || [];
      if (session.domainType === "MEETING" && r.assignedMembers) {
        assignedWorkers = r.assignedMembers.map(name => {
          const m = session.members.find(x => x.name === name);
          return m ? { id: m.participantId || m.memberId.toString(), name: m.name, isMandatory: m.isMandatory } : null;
        }).filter(Boolean);
      }
      return { ...block, assignedWorkers };
    });

    onConfirm({
      confirmedBlocks: blocksWithWorkers,
      title: r.title,
      description: r.description,
      confirmedAt: Date.now(),
      assignments,
      edits: [],
      version: r.version,
    });
    toast.success("일정이 확정되었습니다!");
  };

  if (!isAdminVerified) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">관리자 인증</h2>
            <p className="text-sm text-gray-500 mt-2">대시보드에 접근하려면 관리자 UUID가 필요합니다.</p>
          </div>
          <div className="space-y-4">
            <Input 
              type="password" 
              placeholder="관리자 UUID 입력" 
              value={adminKeyInput}
              onChange={(e) => {
                setAdminKeyInput(e.target.value);
                setAuthError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyAdmin()}
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>돌아가기</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleVerifyAdmin} disabled={isLoading}>인증하기</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500">
              관리자 대시보드 · {session.domainType === "MEETING" ? "회의" : "근무"} ·{" "}
              <span className={session.status === "CONFIRMED" ? "text-emerald-700" : "text-blue-700"}>
                {session.status === "CONFIRMED" ? "확정됨" : "진행 중"}
              </span>
            </p>
            <h2 className="text-gray-900">{session.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsAdminVerified(false)} className="bg-white text-gray-600 hover:text-gray-900">
              일반 대시보드
            </Button>
            <Button variant="outline" onClick={() => setLinkModalOpen(true)} className="gap-2 bg-white">
              <LinkIcon className="w-4 h-4" /> 세션 링크 공유
            </Button>
            <Button variant="outline" onClick={onBack} className="bg-white">
              가용 시간 입력으로 돌아가기
            </Button>
          </div>
        </div>

        {confirmed && (
          <Card className="border-green-300 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CalendarCheck className="w-5 h-5" /> 확정된 일정
              </CardTitle>
              <CardDescription className="text-green-700/90">
                {session.domainType === "WORK" ? (
                  <div>총 {confirmed.confirmedBlocks?.length || 0}개의 근무 구간이 확정되었습니다.</div>
                ) : (
                  confirmed.confirmedBlocks && confirmed.confirmedBlocks.map((tb: any, i: number) => {
                    const dStr = tb.startTime.split("T")[0];
                    const sStr = tb.startTime.split("T")[1].substring(0, 5);
                    const eStr = tb.endTime.split("T")[1].substring(0, 5);
                    return (
                      <div key={i}>
                        {fmtDateLong(dStr)} · {sStr} ~ {eStr === "00:00" ? "24:00" : eStr}
                      </div>
                    );
                  })
                )}
                <div className="mt-1 text-green-700/70">({confirmed.title})</div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {session.domainType === "WORK" ? (
                <div className="space-y-4">
                  <h3 className="text-green-800 font-medium border-b border-green-200 pb-2">근무 스케줄 확정 명단</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {confirmed.confirmedBlocks?.map((tb: any, i: number) => {
                      const dStr = tb.startTime.split("T")[0];
                      const sStr = tb.startTime.split("T")[1].substring(0, 5);
                      const eStr = tb.endTime.split("T")[1].substring(0, 5);
                      const workers = tb.assignedWorkers;
                      return (
                        <div key={i} className="bg-white border border-green-200 rounded-md p-3">
                          <div className="font-medium text-gray-900">{fmtDateLong(dStr)}</div>
                          <div className="text-gray-500 text-sm mb-2">{sStr} ~ {eStr === "00:00" ? "24:00" : eStr}</div>
                          {workers && workers.length > 0 ? (
                            <div className="text-blue-700 text-sm bg-blue-50 px-2 py-1.5 rounded font-medium">
                              배정: {workers.map((w: any) => w.isMandatory ? `${w.name} ★` : w.name).join(", ")}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm">배정 인원 없음</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {session.domainType === "WORK" && confirmed.confirmedBlocks && confirmed.confirmedBlocks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-green-200">
                      <div className="text-xs text-green-700 font-medium mb-2">근무자별 총 주간 근무 시간</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(calcTotalHours(confirmed.confirmedBlocks)).map((h, idx) => (
                          <span key={idx} className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded-md border border-green-200">
                            {h.isMandatory ? `${h.name} ★` : h.name}: <span className="font-bold">{h.total}h</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-green-800">참석자 역할 배치</h3>
                    <span className="text-green-700/70">
                      {attendeesAtConfirmed.length}명 참석 가능
                    </span>
                  </div>
                  {attendeesAtConfirmed.length === 0 ? (
                    <p className="text-green-700/70">
                      이 시간대에 참석 가능한 팀원이 없습니다.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attendeesAtConfirmed.map((s) => {
                        const m = memberById.get(s.memberId);
                        if (!m) return null;
                        const role = confirmed.assignments?.[s.memberId];
                        return (
                          <div
                            key={s.memberId}
                            className="flex items-center justify-between gap-3 bg-white border border-green-200 rounded-md px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-900 truncate">{m.name}</span>
                              <span className="text-gray-400 text-xs">{m.role}</span>
                              {role && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full ${role === "발표자"
                                    ? "bg-blue-100 text-blue-700"
                                    : role === "진행자"
                                      ? "bg-purple-100 text-purple-700"
                                      : role === "기록자"
                                        ? "bg-amber-100 text-amber-700"
                                        : role === "옵저버"
                                          ? "bg-gray-100 text-gray-600"
                                          : "bg-green-100 text-green-700"
                                    }`}
                                >
                                  {role}
                                </span>
                              )}
                              {m.isMandatory && (
                                <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500 shrink-0" />
                              )}
                            </div>
                            <Select
                              value={role ?? "none"}
                              onValueChange={(v) =>
                                setAssignment(s.memberId, v as Role | "none")
                              }
                            >
                              <SelectTrigger className="w-32 h-8 bg-white">
                                <SelectValue placeholder="역할" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— 미배정 —</SelectItem>
                                {ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}



            </CardContent>
            <div className="border-t border-green-200 bg-green-50/50 p-4 flex justify-end">
                <Button 
                  onClick={handleChainSession} 
                  disabled={isChaining}
                  className="bg-green-700 hover:bg-green-800 text-white gap-2"
                >
                  이 멤버 그대로 다음 일정 잡기
                </Button>
              </div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>제출 현황</CardTitle>
            <CardDescription>
              {submissions.length} / {expectedCount}명 제출 완료 · 필참 {requiredCount}명
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {session.members.map((m) => {
                const submitted = submissions.some((s) => s.memberId === m.memberId);
                return (
                  <div
                    key={m.memberId}
                    className="flex items-center justify-between px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={submitted ? "default" : "secondary"}>
                        {submitted ? "✓" : "—"} {m.name}
                      </Badge>
                      <span className="text-gray-400 text-sm">{m.role}</span>
                      {m.isMandatory && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                          필참
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
            {requiredCount > 0 && (
              <p className="text-amber-700">
                ※ 필참 {requiredCount}명이 모두 가능한 시간대만 추천됩니다.
              </p>
            )}
          </CardContent>
        </Card>

        {!hasAnyAvailability ? (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> 추천할 시간이 없습니다
              </CardTitle>
              <CardDescription className="text-red-600/80">
                아직 가용 시간을 제출한 팀원이 없습니다.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : noFeasible ? (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> 가능한 시간이 없습니다
              </CardTitle>
              <CardDescription className="text-red-600/80">
                필참이 모두 가능한 시간이 없습니다. 필참 지정을 조정해주세요.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recs.map((r) => {
                const isSel = selected?.kind === r.kind;
                const rankColor =
                  r.rank === 1
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : r.rank === 2
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : "bg-orange-50 text-orange-700 border-orange-200";
                const typeLabel =
                  session.domainType === "WORK"
                    ? `근무 스케줄`
                    : r.recommendationType === "MAX_ATTENDANCE"
                      ? "최대 인원 참석"
                      : r.recommendationType === "MAX_CONTINUITY"
                        ? "최대 연속 시간"
                        : "균등 분배";
                return (
                  <Card
                    key={r.kind}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer transition ${isSel ? "ring-2 ring-blue-600 shadow-md" : "hover:shadow"
                      }`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${rankColor}`}>
                          {r.rank}위
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {typeLabel}
                        </span>
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{r.icon}</span>
                        <div className="flex flex-col">
                          <span>{r.title}</span>
                          {(r as any).isManuallyAdjusted && (
                            <span className="inline-block mt-0.5 text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-normal w-max">
                              (시간 조정됨)
                            </span>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>{r.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {r.timeBlocks && r.timeBlocks.map((tb, idx) => {
                          const dStr = tb.startTime.split("T")[0];
                          const sStr = tb.startTime.split("T")[1].substring(0, 5);
                          const eStr = tb.endTime.split("T")[1].substring(0, 5);
                          const workers = "assignedWorkers" in tb ? (tb as any).assignedWorkers : null;
                          return (
                            <div key={idx} className="mb-2 last:mb-0">
                              <div className="font-medium text-gray-900">{fmtDateLong(dStr)}</div>
                              <div className="text-gray-500">
                                {sStr} ~ {eStr === "00:00" ? "24:00" : eStr}
                              </div>
                              {workers && (
                                <div className="text-xs text-blue-600 mt-0.5 font-medium">
                                  배정: {workers.map((w: any) => w.isMandatory ? `${w.name} ★` : w.name).join(", ")}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {session.domainType === "WORK" && r.timeBlocks && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-[11px] text-gray-500 mb-1">근무자별 예상 근무 시간</div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.values(calcTotalHours(r.timeBlocks)).map((h, idx) => (
                              <span key={idx} className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                {h.name}: <span className="font-bold">{h.total}h</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            {session.domainType === "WORK" ? "충족률" : "참석률"}
                          </span>
                          <span className="text-xs text-gray-900">
                            {session.domainType === "WORK"
                              ? (r.attendanceRateStr || `${r.attendanceRate}%`)
                              : `${r.attendanceRate}% (${r.attendeeCount}/${r.totalCount}명)`}
                          </span>
                        </div>
                        <Progress value={r.attendanceRate} />
                      </div>

                      {r.assignedMembers.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">참석 가능</div>
                          <div className="flex flex-wrap gap-1">
                            {r.assignedMembers.map((n) => (
                              <span
                                key={n}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.missingMembers.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">불참</div>
                          <div className="flex flex-wrap gap-1">
                            {r.missingMembers.map((n) => (
                              <span
                                key={n}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 line-through"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTimeAdjust(r);
                          }}
                        >
                          시간 미세 조정
                        </Button>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            tryConfirm(r);
                          }}
                        >
                          이 스케줄로 최종 확정하기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>주간 종합 히트맵</CardTitle>
                <CardDescription>
                  파란 테두리 = 추천 미리보기, <span className="text-emerald-700">초록색 칸</span> = 확정된 일정
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HeatmapGrid
                  columns={columns}
                  submissions={submissions}
                  highlights={
                    selected?.timeBlocks
                      ? selected.timeBlocks.map(tb => parseTimeBlock(tb, session.dates)).filter((x): x is {col:number, start:number, end:number} => x !== null)
                      : null
                  }
                  confirmedList={
                    confirmed?.confirmedBlocks
                      ? confirmed.confirmedBlocks.map(tb => parseTimeBlock(tb, session.dates)).filter((x): x is {col:number, start:number, end:number} => x !== null)
                      : null
                  }
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={conflict} onOpenChange={setConflict}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-blue-600" />
              팀원의 일정이 방금 수정되었습니다
            </DialogTitle>
            <DialogDescription>
              다른 팀원이 가용 시간을 업데이트했습니다. 추천안을 다시 계산합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setVersion((v) => v + 1);
                setConflict(false);
                setPendingConfirm(null);
                toast.info("추천안이 갱신되었습니다.");
              }}
            >
              다시 계산하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeAdjustModalOpen} onOpenChange={setTimeAdjustModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Clock className="w-5 h-5" /> 시간 미세 조정 (Time Adjustment)
            </DialogTitle>
            <DialogDescription>
              {session.domainType === "WORK" 
                ? "주간 근무표(Weekly Plan)에 포함된 여러 근무 슬롯들의 시간을 각각 개별적으로 30분 단위 조절할 수 있습니다."
                : "추천된 단일 회의 스케줄의 시간을 앞뒤로 30분 단위로 미세 조정합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-red-600 font-medium text-sm">
              ⚠️ 시간을 임의로 변경할 경우, 기존 배정 인원의 실제 가용 시간과 불일치할 수 있습니다.
            </p>
            <div className="space-y-3">
              {editingBlocks.map((block, i) => {
                const sStr = block.startTime.split("T")[1].substring(0, 5);
                const eStr = block.endTime.split("T")[1].substring(0, 5);
                const dStr = block.startTime.split("T")[0];
                
                const timeOptions = [];
                for (let h = 0; h < 24; h++) {
                  const hh = h.toString().padStart(2, "0");
                  timeOptions.push(`${hh}:00`);
                  timeOptions.push(`${hh}:30`);
                }
                timeOptions.push("24:00");

                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="font-medium min-w-[100px]">{dStr}</div>
                    <Select value={sStr} onValueChange={(v) => updateEditingBlockTime(i, "start", v)}>
                      <SelectTrigger className="w-[120px] bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {timeOptions.slice(0, -1).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-gray-500">~</span>
                    <Select value={eStr === "00:00" ? "24:00" : eStr} onValueChange={(v) => updateEditingBlockTime(i, "end", v === "24:00" ? "00:00" : v)}>
                      <SelectTrigger className="w-[120px] bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {timeOptions.slice(1).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeAdjustModalOpen(false)}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleTimeAdjustSubmit}>
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingConfirm && !conflict} onOpenChange={(o) => !o && setPendingConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" /> 일정이 확정되었습니다
            </DialogTitle>
            <DialogDescription>{pendingConfirm?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setPendingConfirm(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SessionLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        session={session}
      />
    </div>
  );
}
