import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Switch } from "./ui/switch";
import { Calendar } from "./ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import {
  Copy,
  Check,
  Users,
  Briefcase,
  History,
  Trash2,
  CalendarCheck,
  Plus,
  X,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteStored,
  loadAllStored,
  slotLabel,
  copyToClipboard,
  type DomainType,
  type Member,
  type Session,
  type RecentSession,
} from "../types";
import { sessionApi, type ShiftRequirementData } from "../../api/sessionApi";

type Props = {
  onCreate: (s: Session) => void;
  onLoadStored: (entry: RecentSession) => void;
};

interface DayRequirement {
  date: string;
  active: boolean;
  startTime: string;
  endTime: string;
  headcount: number;
}

function generateRequirementData(requirements: DayRequirement[]): ShiftRequirementData {
  const result: any = {};
  
  requirements.forEach((req, idx) => {
    const arr = Array(48).fill(0);
    if (req.active) {
      const startHour = parseInt(req.startTime.split(":")[0], 10);
      const startMin = parseInt(req.startTime.split(":")[1], 10);
      const endHour = parseInt(req.endTime.split(":")[0], 10);
      const endMin = parseInt(req.endTime.split(":")[1], 10);
      
      const startIdx = startHour * 2 + (startMin >= 30 ? 1 : 0);
      const endIdx = endHour * 2 + (endMin >= 30 ? 1 : 0);
      
      for (let i = startIdx; i < endIdx; i++) {
        if (i >= 0 && i < 48) {
          arr[i] = req.headcount;
        }
      }
    }
    result[`day_${idx}`] = arr;
  });
  
  return result as ShiftRequirementData;
}

const timeOptions = Array.from({ length: 49 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

type Draft = { name: string; role: string; isMandatory: boolean };

export function LandingScreen({ onCreate, onLoadStored }: Props) {
  const [stored, setStored] = useState<RecentSession[]>([]);
  useEffect(() => {
    setStored(loadAllStored());
  }, []);
  const refreshStored = () => setStored(loadAllStored());

  const [title, setTitle] = useState("");
  const [domainType, setDomainType] = useState<DomainType>("MEETING");
  const [members, setMembers] = useState<Draft[]>([
    { name: "", role: "", isMandatory: false },
    { name: "", role: "", isMandatory: false },
  ]);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [created, setCreated] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);

  // Wizard Steps & Shift Requirements State
  const [step, setStep] = useState<1 | 2>(1);
  const [dayRequirements, setDayRequirements] = useState<DayRequirement[]>([]);

  useEffect(() => {
    if (!startDate) return;
    const requirements = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      return {
        date: dateStr,
        active: true,
        startTime: "09:00",
        endTime: "18:00",
        headcount: 2,
      };
    });
    setDayRequirements(requirements);
  }, [startDate]);

  const updateMember = (i: number, patch: Partial<Draft>) => {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };
  const addMember = () =>
    setMembers((prev) => [...prev, { name: "", role: "", isMandatory: false }]);
  const removeMember = (i: number) =>
    setMembers((prev) => prev.filter((_, idx) => idx !== i));

  const create = () => {
    if (!title.trim()) {
      toast.error("팀 이름을 입력해주세요.");
      return;
    }
    const cleaned = members
      .map((m) => ({ ...m, name: m.name.trim(), role: m.role.trim() }))
      .filter((m) => m.name);
    if (cleaned.length < 1) {
      toast.error("멤버 명부에 최소 1명 이상 입력해주세요.");
      return;
    }
    if (!startDate) {
      toast.error("기준 시작 날짜를 선택해주세요.");
      return;
    }
    const memberObjs: Member[] = cleaned.map((m, idx) => ({
      memberId: 1000 + idx + 1,
      name: m.name,
      role: m.role || "참여자",
      isMandatory: m.isMandatory,
      hasSubmitted: false,
    }));
    // 로컬 시간대의 연/월/일을 직접 추출하여 YYYY-MM-DD 순수 문자열 포맷팅
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, "0");
    const dd = String(startDate.getDate()).padStart(2, "0");
    const localStartDateString = `${yyyy}-${mm}-${dd}`;

    // 백엔드와 동일하게 startDate 기준 7일간의 후보 날짜 배열을 자동 생성 (로컬 렌더링용)
    const isoDates: string[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dy = d.getFullYear();
      const dm = String(d.getMonth() + 1).padStart(2, "0");
      const ddd = String(d.getDate()).padStart(2, "0");
      return `${dy}-${dm}-${ddd}`;
    });
    
    // Call API
    sessionApi.createSession({
      title: title.trim(),
      domainType,
      startDate: localStartDateString,
      members: cleaned.map(m => ({
        name: m.name,
        role: m.role || "참여자",
        isMandatory: m.isMandatory
      }))
    }).then(res => {
      const session: Session = {
        id: res.sessionId,
        adminKey: res.adminToken,
        title: title.trim(),
        domainType,
        status: "OPEN",
        members: cleaned.map((m, idx) => ({
          memberId: 0, // Mock id until fetch
          name: m.name,
          role: m.role || "참여자",
          isMandatory: m.isMandatory,
          hasSubmitted: false,
        })),
        dates: isoDates,
        createdAt: Date.now(),
        expiresAt: new Date(res.expiresAt).getTime(),
      };
      setCreated(session);
    }).catch((err: any) => {
      console.error(err);
      toast.error("세션 생성 중 오류가 발생했습니다.");
    });
  };

  const createWithRequirements = async () => {
    if (!title.trim()) {
      toast.error("팀 이름을 입력해주세요.");
      return;
    }
    const cleaned = members
      .map((m) => ({ ...m, name: m.name.trim(), role: m.role.trim() }))
      .filter((m) => m.name);
    if (cleaned.length < 1) {
      toast.error("멤버 명부에 최소 1명 이상 입력해주세요.");
      return;
    }
    if (!startDate) {
      toast.error("기준 시작 날짜를 선택해주세요.");
      return;
    }

    // 각 날짜별 시간 검증 및 인덱스 변환
    for (const req of dayRequirements) {
      if (req.active) {
        const startHour = parseInt(req.startTime.split(":")[0], 10);
        const startMin = parseInt(req.startTime.split(":")[1], 10);
        const endHour = parseInt(req.endTime.split(":")[0], 10);
        const endMin = parseInt(req.endTime.split(":")[1], 10);
        
        const startIdx = startHour * 2 + (startMin >= 30 ? 1 : 0);
        const endIdx = endHour * 2 + (endMin >= 30 ? 1 : 0);
        
        if (startIdx >= endIdx) {
          toast.error(`${req.date}의 종료 시간은 시작 시간보다 늦어야 합니다.`);
          return;
        }
      }
    }

    // 로컬 시간대 기준 YYYY-MM-DD 순수 문자열 포맷팅
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, "0");
    const dd = String(startDate.getDate()).padStart(2, "0");
    const localStartDateString = `${yyyy}-${mm}-${dd}`;

    const isoDates: string[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dy = d.getFullYear();
      const dm = String(d.getMonth() + 1).padStart(2, "0");
      const ddd = String(d.getDate()).padStart(2, "0");
      return `${dy}-${dm}-${ddd}`;
    });

    try {
      // 1. Action A: 세션 생성
      const res = await sessionApi.createSession({
        title: title.trim(),
        domainType,
        startDate: localStartDateString,
        members: cleaned.map(m => ({
          name: m.name,
          role: m.role || "참여자",
          isMandatory: m.isMandatory
        }))
      });

      // 2. requirementData 생성
      const reqData = generateRequirementData(dayRequirements);

      try {
        // 3. Action B: 근무 요건 등록
        await sessionApi.registerShiftRequirements(res.sessionId, res.adminToken, {
          requirementData: reqData
        });

        // 성공 처리: A, B 모두 성공하면 최종 완료 화면 렌더링
        const session: Session = {
          id: res.sessionId,
          adminKey: res.adminToken,
          title: title.trim(),
          domainType,
          status: "OPEN",
          members: cleaned.map((m, idx) => ({
            memberId: 0,
            name: m.name,
            role: m.role || "참여자",
            isMandatory: m.isMandatory,
            hasSubmitted: false,
          })),
          dates: isoDates,
          createdAt: Date.now(),
          expiresAt: new Date(res.expiresAt).getTime(),
        };
        setCreated(session);
      } catch (errorB) {
        console.error("Action B (Shift Requirements) Failed:", errorB);
        // 보상 트랜잭션 에러 핸들링:
        // Action B가 실패하면 최종 URL을 노출하지 않고 에러 토스트를 띄운다.
        setCreated(null);
        toast.error("근무 요건 등록 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } catch (errorA) {
      console.error("Action A (Create Session) Failed:", errorA);
      toast.error("세션 생성 중 오류가 발생했습니다.");
    }
  };

  const link = created ? `${window.location.origin}/${created.id}` : "";

  const handleCopyLink = () => {
    copyToClipboard(link, () => {
      setCopied(true);
      toast.success("링크가 복사되었습니다");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const [adminKeyCopied, setAdminKeyCopied] = useState(false);
  const handleCopyAdminKey = () => {
    if (!created?.adminKey) return;
    copyToClipboard(created.adminKey, () => {
      setAdminKeyCopied(true);
      toast.success("관리자 UUID가 복사되었습니다");
      setTimeout(() => setAdminKeyCopied(false), 1500);
    });
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-50 to-white py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-gray-900 mb-3">로그인 없이 시작하는 일정 조율</h1>
          <p className="text-gray-600">
            팀원 명부를 등록하고 익명 링크를 공유하면, 각자 본인을 선택해 주간 가용 시간을 입력합니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 ? "새 세션 만들기 (1/2)" : "근무 요건 설정 (2/2)"}
              </CardTitle>
              <CardDescription>
                {step === 1 
                  ? "기본 정보와 참여 멤버를 입력해 주세요." 
                  : "일정 추천을 위해 각 요일별 필요 근무 요건을 정의합니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">팀 / 프로젝트 이름</Label>
                    <Input
                      id="title"
                      placeholder="예: 소프트웨어공학 팀플 회의"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>목적 (Domain Type)</Label>
                    <ToggleGroup
                      type="single"
                      value={domainType}
                      onValueChange={(v) => v && setDomainType(v as DomainType)}
                      className="justify-start gap-2"
                    >
                      <ToggleGroupItem value="MEETING" className="gap-2 px-4">
                        <Users className="w-4 h-4" /> 회의 (MEETING)
                      </ToggleGroupItem>
                      <ToggleGroupItem value="WORK" className="gap-2 px-4">
                        <Briefcase className="w-4 h-4" /> 근무 (WORK)
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <p className="text-gray-500 text-xs">
                      {domainType === "MEETING"
                        ? "최대 참석률과 연속성을 우선 추천합니다."
                        : "목표 인원 충족과 부하 평준화를 추가로 추천합니다."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>멤버 명부 ({members.filter((m) => m.name.trim()).length}명)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMember}
                        className="gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> 멤버 추가
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {members.map((m, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
                        >
                          <Input
                            placeholder="이름"
                            value={m.name}
                            onChange={(e) => updateMember(i, { name: e.target.value })}
                          />
                          <Input
                            placeholder="역할 (예: PM, Backend)"
                            value={m.role}
                            onChange={(e) => updateMember(i, { role: e.target.value })}
                          />
                          <label className="flex items-center gap-1.5 text-gray-600 text-xs px-1">
                            <Star
                              className={`w-3.5 h-3.5 ${
                                m.isMandatory
                                  ? "fill-amber-500 stroke-amber-500"
                                  : "stroke-gray-400"
                              }`}
                            />
                            필참
                            <Switch
                              checked={m.isMandatory}
                              onCheckedChange={(v) => updateMember(i, { isMandatory: v })}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeMember(i)}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                            aria-label="삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs">
                      필참으로 지정된 멤버가 모두 가능한 시간만 추천됩니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>기준 시작 날짜 (Start Date)</Label>
                    <div className="border border-gray-200 rounded-lg p-2 inline-block bg-white">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => setStartDate(d)}
                      />
                    </div>
                    <p className="text-gray-500 text-xs">
                      {startDate
                        ? `${startDate.toISOString().slice(0, 10)}부터 7일간 자동 생성됩니다.`
                        : "조율을 시작할 첫 날짜를 하나만 선택하세요. 백엔드가 해당 날짜부터 7일간의 후보 날짜를 자동 생성합니다."}
                    </p>
                  </div>

                  {domainType === "MEETING" ? (
                    <Button onClick={create} className="w-full bg-blue-600 hover:bg-blue-700">
                      익명 세션 링크 만들기
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        if (!title.trim()) {
                          toast.error("팀 이름을 입력해주세요.");
                          return;
                        }
                        const cleaned = members.filter((m) => m.name.trim());
                        if (cleaned.length < 1) {
                          toast.error("멤버 명부에 최소 1명 이상 입력해주세요.");
                          return;
                        }
                        if (!startDate) {
                          toast.error("기준 시작 날짜를 선택해주세요.");
                          return;
                        }
                        setStep(2);
                      }} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      다음 단계 (근무 요건 설정)
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {dayRequirements.map((req, idx) => {
                      const d = new Date(req.date);
                      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
                      const dateLabel = `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;

                      return (
                        <div key={req.date} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900 text-sm">{dateLabel} 근무</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{req.active ? "활성화" : "비활성화"}</span>
                              <Switch
                                checked={req.active}
                                onCheckedChange={(v) => {
                                  setDayRequirements(prev => prev.map((item, i) => i === idx ? { ...item, active: v } : item));
                                }}
                              />
                            </div>
                          </div>

                          {req.active && (
                            <div className="grid grid-cols-[1fr_1fr_80px] gap-2 items-end animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="space-y-1">
                                <span className="text-xs text-gray-600 block">시작 시간</span>
                                <select
                                  value={req.startTime}
                                  onChange={(e) => {
                                    setDayRequirements(prev => prev.map((item, i) => i === idx ? { ...item, startTime: e.target.value } : item));
                                  }}
                                  className="flex h-9 w-full rounded-md border border-input bg-white px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  {timeOptions.slice(0, -1).map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-gray-600 block">종료 시간</span>
                                <select
                                  value={req.endTime}
                                  onChange={(e) => {
                                    setDayRequirements(prev => prev.map((item, i) => i === idx ? { ...item, endTime: e.target.value } : item));
                                  }}
                                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  {timeOptions.slice(1).map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-gray-600 block">필요 인원</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={req.headcount}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setDayRequirements(prev => prev.map((item, i) => i === idx ? { ...item, headcount: val } : item));
                                  }}
                                  className="h-9 px-2 text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)} 
                      className="w-1/3"
                    >
                      이전 단계
                    </Button>
                    <Button 
                      onClick={createWithRequirements} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      완료 및 링크 생성
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {stored.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600" />
                    이전 일정 불러오기
                  </CardTitle>
                  <CardDescription>
                    이 브라우저에 저장된 최근 세션입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-gray-100">
                  {stored.map((entry) => {
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-3"
                      >
                        <button
                          onClick={() => onLoadStored(entry)}
                          className="text-left flex-1 hover:bg-gray-50 rounded-md px-2 py-1 -mx-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">{entry.title}</span>
                            <span className="text-gray-400">
                              · {entry.domainType === "MEETING" ? "회의" : "근무"}
                            </span>
                          </div>
                          <div className="text-gray-500 mt-0.5">
                            {entry.submittedCount}/{entry.memberCount}명 제출
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            deleteStored(entry.id);
                            refreshStored();
                            toast.success("삭제되었습니다.");
                          }}
                          className="p-2 text-gray-400 hover:text-red-600"
                          aria-label="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>이렇게 동작해요</CardTitle>
                <CardDescription>3단계로 끝나는 익명 일정 조율</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>팀원 명부를 등록하고 링크를 공유</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>참여자는 본인을 선택 후 주간 가용 시간 입력</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>대시보드에서 추천 시간을 확정</span>
                </div>
              </CardContent>
            </Card>

            <p className="text-gray-400">
              이 세션 데이터는 14일 후 자동으로 영구 삭제됩니다.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세션이 생성되었습니다 🎉</DialogTitle>
            <DialogDescription>
              아래 링크를 팀원들에게 공유하여 가용 시간을 모아주세요.<br/>
              <strong className="text-red-600 mt-2 block">주의: 관리자 페이지 접속을 위한 관리자 UUID를 반드시 복사해두세요!</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">팀원 공유용 세션 링크</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} className="bg-gray-50 text-gray-500 font-mono text-sm" />
                <Button
                  variant="secondary"
                  onClick={handleCopyLink}
                  className="bg-gray-700 text-white hover:bg-gray-800"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-red-700">관리자 전용 UUID (수정/확정용)</Label>
              <div className="flex gap-2">
                <Input readOnly value={created?.adminKey ?? ""} className="bg-red-50 border-red-200 text-red-700 font-mono text-sm" />
                <Button
                  variant="outline"
                  onClick={handleCopyAdminKey}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  {adminKeyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Button
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            onClick={() => created && onCreate(created)}
          >
            세션으로 이동하기
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
