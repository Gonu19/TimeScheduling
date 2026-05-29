import { useCallback, useRef, useState, useEffect } from "react";
import { SLOTS_PER_DAY, slotLabel } from "../types";

export type Column = { key: string; top: string; bot: string };

type Props = {
  columns: Column[];
  // 2D array indexed by column position
  value: boolean[][];
  onChange: (next: boolean[][]) => void;
  readOnly?: boolean;
};

export function TimeGrid({ columns, value, onChange, readOnly }: Props) {
  const [dragging, setDragging] = useState<null | { mode: boolean }>(null);
  const lastTouched = useRef<string>("");

  useEffect(() => {
    const up = () => setDragging(null);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const setCell = useCallback(
    (col: number, slot: number, on: boolean) => {
      const key = `${col}:${slot}`;
      if (lastTouched.current === key) return;
      lastTouched.current = key;
      const next = value.map((d) => d.slice());
      if (!next[col]) next[col] = new Array(SLOTS_PER_DAY).fill(false);
      next[col][slot] = on;
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div className="overflow-auto border border-gray-200 rounded-lg select-none">
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

        {Array.from({ length: SLOTS_PER_DAY }).map((_, slot) => (
          <FragmentRow
            key={slot}
            slot={slot}
            columns={columns}
            value={value}
            readOnly={!!readOnly}
            onDown={(col) => {
              if (readOnly) return;
              const current = value[col]?.[slot] ?? false;
              setDragging({ mode: !current });
              lastTouched.current = "";
              setCell(col, slot, !current);
            }}
            onEnter={(col) => {
              if (readOnly || !dragging) return;
              setCell(col, slot, dragging.mode);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  slot,
  columns,
  value,
  readOnly,
  onDown,
  onEnter,
}: {
  slot: number;
  columns: Column[];
  value: boolean[][];
  readOnly: boolean;
  onDown: (col: number) => void;
  onEnter: (col: number) => void;
}) {
  const showLabel = slot % 2 === 0;
  return (
    <>
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
        const on = value[idx]?.[slot] ?? false;
        return (
          <div
            key={c.key}
            onMouseDown={() => onDown(idx)}
            onMouseEnter={() => onEnter(idx)}
            className={`border-l border-gray-100 ${slot % 2 === 0 ? "border-t" : ""} ${
              on ? "bg-blue-600" : "bg-gray-50 hover:bg-blue-100"
            } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            style={{ height: 18 }}
          />
        );
      })}
    </>
  );
}
