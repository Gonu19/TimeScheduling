import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ArrowLeft, Check, Star, Copy } from "lucide-react";
import { toast } from "sonner";
import { TimeGrid, type Column } from "./TimeGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  emptyDay,
  fmtDateShort,
  type Member,
  type Session,
  type Submission,
} from "../types";

function emptyForDates(n: number): boolean[][] {
  return Array.from({ length: n }, emptyDay);
}

type Props = {
  session: Session;
  submissions: Submission[];
  onSubmit: (s: Submission) => Promise<void>;
  onGoDashboard: () => void;
};

export function AvailabilityScreen({ session, submissions, onSubmit, onGoDashboard }: Props) {
  const submittedIds = useMemo(
    () => new Set(submissions.map((s) => s.memberId)),
    [submissions],
  );

  const [selected, setSelected] = useState<Member | null>(null);
  const [slots, setSlots] = useState<boolean[][]>(() =>
    emptyForDates(session.dates.length),
  );

  const startEditing = (m: Member) => {
    const existing = submissions.find((s) => s.memberId === m.memberId);
    setSlots(
      existing ? existing.slots.map((d) => d.slice()) : emptyForDates(session.dates.length),
    );
    setSelected(m);
  };

  const submit = async () => {
    if (!selected) return;
    const any = slots.some((day) => day.some(Boolean));
    if (!any) {
      toast.error("가용시간을 최소 한 슬롯 이상 선택해주세요.");
      return;
    }
    try {
      await onSubmit({
        memberId: selected.memberId,
        slots,
        submittedAt: Date.now(),
      });
      localStorage.setItem("schedulr_last_availability", JSON.stringify(slots));
      toast.success("제출되었습니다.");
    } catch (err) {
      // Parent handles error
    }
  };

  const handleLoadPrevious = () => {
    try {
      const stored = localStorage.getItem("schedulr_last_availability");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;

      setSlots((prev) => {
        const next = prev.map((day) => [...day]);
        for (let d = 0; d < Math.min(next.length, parsed.length); d++) {
          const dayArr = parsed[d];
          if (Array.isArray(dayArr)) {
            for (let s = 0; s < Math.min(next[d].length, dayArr.length); s++) {
              next[d][s] = Boolean(dayArr[s]);
            }
          }
        }
        return next;
      });
      toast.success("이전 가용시간을 성공적으로 불러왔습니다.");
    } catch (e) {
      console.error(e);
      toast.error("가용시간을 불러오는데 실패했습니다.");
    }
  };

  const columns: Column[] = session.dates.map((d) => {
    const f = fmtDateShort(d);
    return { key: d, top: f.top, bot: f.bot };
  });

  // Member selection screen
  if (!selected) {
    return (
      <div className="min-h-full bg-gray-50 py-8 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">
                세션 · {session.domainType === "MEETING" ? "회의" : "근무"}
              </p>
              <h2 className="text-gray-900">{session.title}</h2>
            </div>
            <Button variant="outline" onClick={onGoDashboard}>
              관리자 대시보드 보기
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>본인을 선택해주세요</CardTitle>
              <CardDescription>
                팀에 등록된 멤버 중에서 본인을 선택하면 가용 시간 입력 화면으로 이동합니다.
                이미 제출한 멤버는 "수정"으로 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {session.members.map((m) => {
                  const submitted = submittedIds.has(m.memberId);
                  return (
                    <button
                      key={m.memberId}
                      onClick={() => startEditing(m)}
                      className={`text-left rounded-lg border p-4 transition ${
                        submitted
                          ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                          : "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{m.name}</span>
                        {m.isMandatory && (
                          <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-500">{m.role}</span>
                        {submitted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <Check className="w-3.5 h-3.5" /> 제출 · 수정
                          </span>
                        ) : (
                          <span className="text-blue-600">입력하기 →</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> 멤버 선택
            </Button>
            <div>
              <p className="text-gray-500">{session.title}</p>
              <h2 className="text-gray-900 flex items-center gap-2">
                {selected.name}
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{selected.role}</span>
                {selected.isMandatory && (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" /> 필참
                  </span>
                )}
              </h2>
            </div>
          </div>
          <Button variant="outline" onClick={onGoDashboard}>
            관리자 대시보드 보기
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>가용 시간 입력</CardTitle>
            <CardDescription>
              후보 날짜 중 가능한 시간을 30분 단위로 드래그하여 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex flex-wrap items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-md px-3 py-2 w-full sm:w-auto flex-1">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Copy className="w-4 h-4" />
                  다른 팀원 시간표 복사하기
                </div>
                <Select
                  onValueChange={(val) => {
                    const targetId = Number(val);
                    const target = submissions.find((s) => s.memberId === targetId);
                    if (!target) {
                      toast.error("아직 시간표를 등록하지 않은 멤버입니다");
                      return;
                    }
                    setSlots(target.slots.map((d) => d.slice()));
                    const m = session.members.find((x) => x.memberId === targetId);
                    toast.success(`${m?.name ?? "팀원"}의 시간표를 불러왔습니다`);
                  }}
                >
                  <SelectTrigger className="w-56 bg-white">
                    <SelectValue placeholder="복사할 팀원 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {session.members
                      .filter((m) => m.memberId !== selected.memberId)
                      .map((m) => {
                        const hasSub = submissions.some((s) => s.memberId === m.memberId);
                        return (
                          <SelectItem key={m.memberId} value={String(m.memberId)} disabled={!hasSub}>
                            {m.name} {hasSub ? "" : "(미입력)"}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {localStorage.getItem("schedulr_last_availability") && (
                <Button variant="outline" onClick={handleLoadPrevious} className="bg-white whitespace-nowrap">
                  이전 가용시간 불러오기
                </Button>
              )}
            </div>

            <TimeGrid columns={columns} value={slots} onChange={setSlots} />

            <div className="flex gap-3 justify-end">
              <Button onClick={submit} className="bg-blue-600 hover:bg-blue-700">
                내 가용시간 저장하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
