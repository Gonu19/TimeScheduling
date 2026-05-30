import { CalendarRange, LayoutDashboard, Sparkles } from "lucide-react";

type View = "landing" | "availability" | "dashboard";

type Props = {
  view: View;
  sessionName?: string;
  canGoApp: boolean;
  onNavigate: (v: View) => void;
};

export function TopNav({ view, sessionName, canGoApp, onNavigate }: Props) {
  const item = (active: boolean) =>
    `px-3 py-1.5 rounded-md transition ${
      active
        ? "bg-blue-50 text-blue-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto h-14 px-6 flex items-center gap-6">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2 text-gray-900"
        >
          <span className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center">
            <CalendarRange className="w-4 h-4" />
          </span>
          <span>Schedulr</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          <button onClick={() => onNavigate("landing")} className={item(view === "landing")}>
            세션 생성
          </button>
          <button
            onClick={() => canGoApp && onNavigate("availability")}
            disabled={!canGoApp}
            className={`${item(view === "availability")} ${
              !canGoApp ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            가용 시간
          </button>
          <button
            onClick={() => canGoApp && onNavigate("dashboard")}
            disabled={!canGoApp}
            className={`${item(view === "dashboard")} inline-flex items-center gap-1.5 ${
              !canGoApp ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> 대시보드
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {sessionName && (
            <span className="hidden lg:inline text-gray-500">
              현재 세션: <span className="text-gray-800">{sessionName}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
