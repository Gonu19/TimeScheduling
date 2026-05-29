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
import { AlertTriangle, RotateCw, Check, CalendarCheck, Star, Pencil, History, Link as LinkIcon } from "lucide-react";
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
      const startDate = new Date(confirmed.date);
      const isoDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      
      const res = await sessionApi.createSession({
        title: session.title + " (다음 일정)",
        domainType: session.domainType,
        candidateDates: isoDates,
        members: session.members.map(m => ({
          name: m.name,
          role: m.role || "참여자",
          isMandatory: m.isMandatory
        }))
      });
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
  const [editOpen, setEditOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [overrideRows, setOverrideRows] = useState<
    Array<{ time: string; removed: string; added: string }>
  >([{ time: "", removed: "", added: "" }]);
  const [editReason, setEditReason] = useState("");

  const memberById = useMemo(
    () => new Map(session.members.map((m) => [m.memberId, m])),
    [session.members],
  );

  const columns: Column[] = session.dates.map((d) => {
    const f = fmtDateShort(d);
    return { key: d, top: f.top, bot: f.bot };
  });

  const openEdit = () => {
    if (!confirmed) return;
    setOverrideRows([{ time: slotLabel(confirmed.start), removed: "", added: "" }]);
    setEditReason("");
    setEditOpen(true);
  };

  const submitEdit = () => {
    if (!confirmed) return;
    if (!editReason.trim()) {
      toast.error("수정 사유를 입력해주세요. (감사 로그용)");
      return;
    }
    const cleaned = overrideRows
      .map((r) => ({ time: r.time.trim(), removed: r.removed.trim(), added: r.added.trim() }))
      .filter((r) => r.time && (r.removed || r.added));
    if (cleaned.length === 0) {
      toast.error("최소 1개 이상의 슬롯 변경을 입력해주세요.");
      return;
    }

    // apply removed/added to assignments map (member name → memberId lookup)
    const assignments = { ...(confirmed.assignments ?? {}) };
    for (const row of cleaned) {
      if (row.removed) {
        const m = session.members.find((x) => x.name === row.removed);
        if (m) delete assignments[m.memberId];
      }
      if (row.added) {
        const m = session.members.find((x) => x.name === row.added);
        if (m) assignments[m.memberId] = "참여자";
      }
    }

    const next: ConfirmedSlot = {
      ...confirmed,
      assignments,
      description: `${fmtDateLong(confirmed.date)} ${slotLabel(confirmed.start)}~${slotLabel(confirmed.end)} (수동 보정 ${cleaned.length}건)`,
      edits: [
        ...(confirmed.edits ?? []),
        {
          at: Date.now(),
          reason: editReason.trim(),
          adjustedSlots: cleaned.map((r) => ({
            time: r.time,
            removed: r.removed || undefined,
            added: r.added || undefined,
          })),
        },
      ],
    };
    onConfirm(next);
    setEditOpen(false);
    toast.success("스케줄이 강제 수정되었습니다.");
  };

  const updateRow = (i: number, patch: Partial<{ time: string; removed: string; added: string }>) => {
    setOverrideRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => setOverrideRows((prev) => [...prev, { time: "", removed: "", added: "" }]);
  const removeRow = (i: number) =>
    setOverrideRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const setAssignment = (memberId: number, role: Role | "none") => {
    if (!confirmed) return;
    const assignments = { ...(confirmed.assignments ?? {}) };
    if (role === "none") delete assignments[memberId];
    else assignments[memberId] = role;
    onConfirm({ ...confirmed, assignments });
  };

  const confirmedCol = confirmed ? session.dates.indexOf(confirmed.date) : -1;

  const attendeesAtConfirmed = confirmed
    ? submissions.filter((s) => {
      const day = s.slots[confirmedCol];
      if (!day) return false;
      for (let i = confirmed.start; i < confirmed.end; i++) if (!day[i]) return false;
      return true;
    })
    : [];

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
        const data = await sessionApi.getRecommendations(session.id, mandatoryIds);
        if (!active) return;
        
        const timeToSlot = (t: string) => {
          if (!t) return 0;
          const [h, m] = t.split(":").map(Number);
          return h * 2 + (m >= 30 ? 1 : 0);
        };
        
        const allNames = session.members.map(m => m.name);
        
        const mapped: Recommendation[] = (data || []).map((r, i) => {
          const kind = r.recommendationType === "MAX_ATTENDANCE" ? "attendance" :
            r.recommendationType === "MAX_CONTINUITY" ? "continuity" : "balanced";
          const title = r.recommendationType === "MAX_ATTENDANCE" ? "최대 참석률" :
            r.recommendationType === "MAX_CONTINUITY" ? "최대 연속 시간" : "균등 분배";
          const icon = r.recommendationType === "MAX_ATTENDANCE" ? "🏆" :
            r.recommendationType === "MAX_CONTINUITY" ? "⏱️" : "⚖️";
          const col = session.dates.indexOf(r.date);
          
          const assigned = r.attendees || [];
          const missing = allNames.filter(n => !assigned.includes(n));
          
          return {
            kind,
            recommendationType: r.recommendationType as any,
            rank: r.rank || i + 1,
            title,
            icon,
            col,
            date: r.date,
            start: timeToSlot(r.startTime),
            end: timeToSlot(r.endTime),
            attendeeCount: assigned.length,
            totalCount: session.members.length,
            attendanceRate: r.attendanceRate || 0,
            assignedMembers: assigned,
            missingMembers: missing,
            description: `${title} 추천안입니다.`,
          };
        });
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

  const toggleRequired = (memberId: number) => {
    const next = session.members.map((m) =>
      m.memberId === memberId ? { ...m, isMandatory: !m.isMandatory } : m,
    );
    onUpdateMembers(next);
  };

  const tryConfirm = (r: Recommendation) => {
    if (Math.random() < 0.2 && submissions.length > 1) {
      setPendingConfirm(r);
      setConflict(true);
      return;
    }
    const assignments: Record<number, Role> = {};
    for (const s of submissions) {
      const day = s.slots[r.col];
      if (!day) continue;
      let ok = true;
      for (let i = r.start; i < r.end; i++) if (!day[i]) { ok = false; break; }
      if (ok) assignments[s.memberId] = "참여자";
    }
    onConfirm({
      date: r.date,
      start: r.start,
      end: r.end,
      title: r.title,
      description: r.description,
      confirmedAt: Date.now(),
      assignments,
      edits: [],
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
                {fmtDateLong(confirmed.date)} · {slotLabel(confirmed.start)} ~{" "}
                {slotLabel(confirmed.end)}
                <span className="ml-2 text-green-700/70">({confirmed.title})</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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

              {confirmed.edits && confirmed.edits.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-green-800 mb-2">
                    <History className="w-4 h-4" /> 수정 이력
                  </h3>
                  <ul className="space-y-1.5">
                    {confirmed.edits
                      .slice()
                      .reverse()
                      .map((e, i) => (
                        <li
                          key={i}
                          className="bg-white border border-green-200 rounded-md px-3 py-2"
                        >
                          {e.adjustedSlots && e.adjustedSlots.length > 0 ? (
                            <div className="space-y-0.5">
                              {e.adjustedSlots.map((a, k) => (
                                <div key={k} className="text-gray-700 text-sm">
                                  <span className="font-mono">{a.time}</span>
                                  {a.removed && (
                                    <span className="ml-2 text-red-600">− {a.removed}</span>
                                  )}
                                  {a.added && (
                                    <span className="ml-2 text-emerald-700">+ {a.added}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : e.from && e.to ? (
                            <div className="text-gray-700">
                              {e.from.date} {slotLabel(e.from.start)}~{slotLabel(e.from.end)}
                              <span className="mx-2 text-gray-400">→</span>
                              {e.to.date} {slotLabel(e.to.start)}~{slotLabel(e.to.end)}
                            </div>
                          ) : null}
                          <div className="text-gray-500 mt-1 text-sm">사유: {e.reason}</div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-100"
                  onClick={openEdit}
                >
                  <Pencil className="w-4 h-4" /> 일정 수동 수정
                </Button>
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => {
                    onConfirm(null);
                    toast.info("확정을 취소했습니다.");
                  }}
                >
                  확정 취소
                </Button>
              </div>
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
                    <label className="flex items-center gap-2 text-gray-600">
                      필참
                      <Switch
                        checked={m.isMandatory}
                        onCheckedChange={() => toggleRequired(m.memberId)}
                      />
                    </label>
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
                  r.recommendationType === "MAX_ATTENDANCE"
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
                        {r.title}
                      </CardTitle>
                      <CardDescription>{r.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{fmtDateLong(r.date)}</div>
                        <div className="text-gray-500">
                          {slotLabel(r.start)} ~ {slotLabel(r.end)}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">참석률</span>
                          <span className="text-xs text-gray-900">
                            {r.attendanceRate}% ({r.attendeeCount}/{r.totalCount}명)
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

                      <Button
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          tryConfirm(r);
                        }}
                      >
                        이 스케줄로 최종 확정하기
                      </Button>
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
                  highlight={
                    selected
                      ? { col: selected.col, start: selected.start, end: selected.end }
                      : null
                  }
                  confirmed={
                    confirmed && confirmedCol >= 0
                      ? {
                        col: confirmedCol,
                        start: confirmed.start,
                        end: confirmed.end,
                      }
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> 스케줄 수동 보정 (Manual Override)
            </DialogTitle>
            <DialogDescription>
              확정된 일정에서 특정 타임 슬롯의 참석자를 강제로 교체합니다. 모든 변경은 감사 로그에 기록됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>변경할 타임 슬롯</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  슬롯 추가
                </Button>
              </div>
              <div className="space-y-2">
                {overrideRows.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[110px_1fr_1fr_auto] gap-2 items-center border border-gray-200 rounded-md p-2 bg-gray-50/50"
                  >
                    <Select
                      value={row.time}
                      onValueChange={(v) => updateRow(i, { time: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="시간" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {confirmed &&
                          Array.from({ length: confirmed.end - confirmed.start }).map((_, k) => {
                            const slot = confirmed.start + k;
                            return (
                              <SelectItem key={slot} value={slotLabel(slot)}>
                                {slotLabel(slot)}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={row.removed || "_none"}
                      onValueChange={(v) => updateRow(i, { removed: v === "_none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="제외할 팀원" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— 없음 —</SelectItem>
                        {session.members.map((m) => (
                          <SelectItem key={m.memberId} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={row.added || "_none"}
                      onValueChange={(v) => updateRow(i, { added: v === "_none" ? "" : v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="대체 투입할 팀원" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— 없음 —</SelectItem>
                        {session.members.map((m) => (
                          <SelectItem key={m.memberId} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      aria-label="행 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                시간(time), 제외할 팀원(removed), 대체 투입할 팀원(added) — 각 행은 둘 중 최소 하나는 채워야 합니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                수정 사유 <span className="text-red-500">*</span>{" "}
                <span className="text-xs text-gray-500">(감사 로그 저장용)</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="예: 강은우 병가로 인한 당일 긴급 교체 투입"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submitEdit}>
              강제 수정 적용
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
