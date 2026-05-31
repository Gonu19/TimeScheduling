import { SLOTS_PER_DAY, slotLabel, type Submission } from "../types";
import type { Column } from "./TimeGrid";

export type GridBlock = { col: number; start: number; end: number };

type Props = {
  columns: Column[];
  submissions: Submission[];
  highlights?: GridBlock[] | null;
  confirmedList?: GridBlock[] | null;
};

export function HeatmapGrid({ columns, submissions, highlights, confirmedList }: Props) {
  const total = Math.max(submissions.length, 1);

  const count = (col: number, slot: number) =>
    submissions.reduce((acc, s) => acc + (s.slots[col]?.[slot] ? 1 : 0), 0);

  const colorFor = (n: number) => {
    const ratio = n / total;
    if (n === 0) return "bg-gray-50";
    if (ratio < 0.25) return "bg-blue-100";
    if (ratio < 0.5) return "bg-blue-300";
    if (ratio < 0.75) return "bg-blue-500";
    return "bg-blue-700";
  };

  return (
    <div className="overflow-auto border border-gray-200 rounded-lg">
      <div
        className="grid"
        style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(72px, 1fr))` }}
      >
        <div className="sticky top-0 left-0 z-20 bg-white border-b border-r border-gray-200" />
        {columns.map((c) => (
          <div
            key={c.key}
            className="sticky top-0 z-10 bg-white border-b border-gray-200 text-center py-2"
          >
            <div className="text-gray-900">{c.top}</div>
            <div className="text-gray-500">{c.bot}</div>
          </div>
        ))}

        {Array.from({ length: SLOTS_PER_DAY }).map((_, slot) => {
          const showLabel = slot % 2 === 0;
          return (
            <div key={slot} className="contents">
              <div
                className={`sticky left-0 z-10 bg-white border-r border-gray-200 text-right pr-2 text-gray-500 text-xs ${
                  showLabel ? "border-t" : ""
                }`}
                style={{ height: 18 }}
              >
                {showLabel ? (
                  <div className="relative -top-1.5 leading-none bg-white pr-1 inline-block">
                    {slotLabel(slot)}
                  </div>
                ) : (
                  ""
                )}
              </div>
              {columns.map((c, idx) => {
                const n = count(idx, slot);
                const isHl =
                  highlights?.some((h) => h.col === idx && slot >= h.start && slot < h.end) ?? false;
                const isConfirmed =
                  confirmedList?.some((c) => c.col === idx && slot >= c.start && slot < c.end) ?? false;
                const isStartConfirmed = 
                  confirmedList?.some((c) => c.col === idx && slot === c.start) ?? false;
                  
                const baseColor = isConfirmed ? "bg-emerald-500" : colorFor(n);
                return (
                  <div
                    key={c.key}
                    title={`${slotLabel(slot)} · ${n}/${submissions.length}명${
                      isConfirmed ? " · 확정" : ""
                    }`}
                    className={`relative border-l border-gray-100 ${slot % 2 === 0 ? "border-t" : ""} ${baseColor} ${
                      isHl && !isConfirmed ? "ring-2 ring-inset ring-blue-600" : ""
                    } ${isConfirmed ? "ring-2 ring-inset ring-emerald-700 z-10" : ""}`}
                    style={{ height: 18 }}
                  >
                    {isStartConfirmed && (
                      <span className="absolute -top-0.5 left-1 text-[10px] leading-none text-white">
                        ✓ 확정
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
