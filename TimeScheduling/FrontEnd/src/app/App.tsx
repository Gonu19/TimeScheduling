import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog";
import { LandingScreen } from "./components/LandingScreen";
import { AvailabilityScreen } from "./components/AvailabilityScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { TopNav } from "./components/TopNav";
import {
  saveStored,
  type ConfirmedSlot,
  type Member,
  type Session,
  type RecentSession,
  type Submission,
} from "./types";
import { sessionApi } from "../api/sessionApi";
import { decodeBitmask } from "../utils/bitmaskUtils";

function AppLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");

  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchSession = async (sid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sessionApi.getSession(sid);
      const nextSession: Session = {
        id: sid,
        title: data.title,
        domainType: data.domainType as any,
        status: data.status as any,
        members: data.members.map((m) => ({
          memberId: m.memberId,
          name: m.name,
          role: m.role,
          isMandatory: m.isMandatory,
          hasSubmitted: m.hasSubmitted,
        })),
        dates: data.candidateDates,
        createdAt: Date.now(),
        requirementsJson: data.requirementsJson,
      };
      
      const nextSubmissions: Submission[] = data.members
        .filter((m) => m.hasSubmitted)
        .map((m) => ({
          memberId: m.memberId,
          slots: m.availableBitmasks.map((mask) => decodeBitmask(mask)),
          submittedAt: Date.now(),
        }));

      setSession(nextSession);
      setSubmissions(nextSubmissions);

      if (data.status === "CONFIRMED") {
        try {
          const result = await sessionApi.getConfirmedSchedule(sid);
          const assignments: Record<number, any> = {};
          data.members.forEach(m => {
            if (["진행자", "기록자", "참여자", "옵저버", "발표자"].includes(m.role)) {
              assignments[m.memberId] = m.role;
            }
          });

          setConfirmed({
            title: result.title,
            confirmedBlocks: result.confirmedBlocks,
            description: "",
            confirmedAt: Date.now(),
            assignments,
            version: result.version,
          });
        } catch (e) {
          console.error("확정 스케줄 조회 실패:", e);
        }
      } else {
        setConfirmed(null);
      }

      saveStored({
        id: sid,
        title: data.title,
        domainType: data.domainType,
        memberCount: data.members.length,
        submittedCount: nextSubmissions.length,
        updatedAt: Date.now(),
      });
      return nextSession;
    } catch (err) {
      console.error(err);
      setError("세션을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && (!session || session.id !== sessionId)) {
      fetchSession(sessionId).then(() => {
        if (location.pathname === `/${sessionId}` || location.pathname === `/${sessionId}/`) {
          navigate(`/${sessionId}/availability`, { replace: true });
        }
      });
    }
  }, [sessionId]);

  const handleSubmit = async (sub: Submission) => {
    if (!session) return;
    setIsLoading(true);
    try {
      await sessionApi.submitAvailability(session.id, sub.memberId, sub.slots);
      await fetchSession(session.id);
      navigate(`/${session.id}/dashboard`);
    } catch (err) {
      console.error(err);
      setError("제출에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMembers = (next: Member[]) => {
    if (!session) return;
    setSession({ ...session, members: next });
  };

  const handleConfirm = async (c: ConfirmedSlot | null) => {
    if (!session) return;
    if (c) {
      setIsLoading(true);
      try {
        await sessionApi.confirmSchedule(session.id, {
          confirmedBlocks: c.confirmedBlocks,
          version: c.version || 0,
          assignments: c.assignments,
        });
        await fetchSession(session.id);
        setConfirmed(c); 
      } catch (err) {
        console.error(err);
        setError("일정 확정에 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setConfirmed(null);
      setSession({ ...session, status: "OPEN" });
    }
  };

  const handleAdminVerify = async () => {
    if (!session) return;
    try {
      const isValid = await sessionApi.verifyAdmin(session.id, adminKeyInput.trim());
      if (isValid) {
        setIsAdminVerified(true);
        setAdminToken(adminKeyInput.trim());
        setShowAdminModal(false);
        setAdminKeyInput("");
        toast.success("관리자 인증에 성공했습니다.");
        navigate(`/${session.id}/dashboard`);
      } else {
        toast.error("관리자 UUID가 일치하지 않습니다.");
      }
    } catch (err) {
      toast.error("인증 중 오류가 발생했습니다.");
    }
  };

  // Determine view for TopNav based on route
  const view = location.pathname.endsWith("dashboard") ? "dashboard" : "availability";

  return (
    <div className="size-full bg-white relative">
      {error && (
        <div className="absolute top-14 left-0 right-0 bg-red-100 text-red-700 p-3 text-center z-50 font-medium">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-r-4 border-r-transparent"></div>
        </div>
      )}

      <TopNav
        view={view}
        sessionName={session?.title}
        canGoApp={!!session}
        onNavigate={(v) => {
          if (v === "landing") {
            navigate("/");
          } else if (v === "dashboard" && !isAdminVerified) {
            setShowAdminModal(true);
          } else {
            navigate(`/${sessionId}/${v}`);
          }
        }}
      />
      
      {session ? (
        <Routes>
          <Route path="availability" element={
            <AvailabilityScreen
              session={session}
              submissions={submissions}
              confirmed={confirmed}
              onSubmit={handleSubmit}
              onGoDashboard={() => {
                if (isAdminVerified) navigate(`/${session.id}/dashboard`);
                else setShowAdminModal(true);
              }}
            />
          } />
          <Route path="dashboard" element={
            <DashboardScreen
              session={session}
              submissions={submissions}
              confirmed={confirmed}
              onConfirm={handleConfirm}
              onUpdateMembers={handleUpdateMembers}
              onBack={() => navigate(`/${session.id}/availability`)}
              isLoading={isLoading}
              isAdminVerified={isAdminVerified}
              setIsAdminVerified={setIsAdminVerified}
              adminToken={adminToken}
              onAdminVerify={setAdminToken}
              onFetchSession={async () => { await fetchSession(session.id); }}
            />
          } />
          <Route path="*" element={<Navigate to={`/${session.id}/availability`} replace />} />
        </Routes>
      ) : (
        <div className="p-8 text-center text-gray-500">세션을 불러오는 중입니다...</div>
      )}

      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 인증</DialogTitle>
            <DialogDescription>
              대시보드에 접근하려면 관리자 UUID가 필요합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="관리자 UUID 입력"
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminVerify()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminModal(false)}>취소</Button>
            <Button onClick={handleAdminVerify}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  const handleCreate = (s: Session) => {
    navigate(`/${s.id}/availability`);
  };

  const handleLoadStored = (entry: RecentSession) => {
    navigate(`/${entry.id}/dashboard`);
  };

  return (
    <>
      <Routes>
        <Route path="/" element={
          <div className="size-full bg-white relative">
            <TopNav view="landing" canGoApp={false} onNavigate={() => {}} />
            <LandingScreen onCreate={handleCreate} onLoadStored={handleLoadStored} />
          </div>
        } />
        <Route path="/:sessionId/*" element={<AppLayout />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}
