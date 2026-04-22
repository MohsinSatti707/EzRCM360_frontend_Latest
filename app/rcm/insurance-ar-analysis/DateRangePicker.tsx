"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  joinedRight?: boolean;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

export function fmtShortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function sod(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildGrid(year: number, month: number) {
  const cells: { date: Date; current: boolean }[] = [];
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  const prevTotal = new Date(year, month, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, prevTotal - i), current: false });
  const total = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= total; d++) cells.push({ date: new Date(year, month, d), current: true });
  let n = 1;
  while (cells.length < 42) cells.push({ date: new Date(year, month + 1, n++), current: false });
  return cells;
}

function MonthCalendar({
  year, month, start, end, hover,
  onDay, onHover,
  onPrevY, onNextY, onPrevM, onNextM,
}: {
  year: number; month: number;
  start: Date | null; end: Date | null; hover: Date | null;
  onDay: (d: Date) => void; onHover: (d: Date | null) => void;
  onPrevY: () => void; onNextY: () => void; onPrevM: () => void; onNextM: () => void;
}) {
  const cells = buildGrid(year, month);
  const effEnd = end ?? hover;

  const lo = start && effEnd
    ? sod(start) <= sod(effEnd) ? sod(start) : sod(effEnd)
    : null;
  const hi = start && effEnd
    ? sod(start) <= sod(effEnd) ? sod(effEnd) : sod(start)
    : null;

  return (
    <div className="w-[320px] px-5 py-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-0.5">
        <button type="button" onClick={onPrevY} className="flex h-7 w-7 items-center justify-center rounded text-[13px] font-bold text-[#64748B] hover:bg-[#F1F5F9]">«</button>
        <button type="button" onClick={onPrevM} className="flex h-7 w-7 items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9]">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="flex-1 text-center font-aileron font-semibold text-[14px] text-[#202830]">
          {MONTHS[month]} {year}
        </span>
        <button type="button" onClick={onNextM} className="flex h-7 w-7 items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9]">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={onNextY} className="flex h-7 w-7 items-center justify-center rounded text-[13px] font-bold text-[#64748B] hover:bg-[#F1F5F9]">»</button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="flex h-7 items-center justify-center font-aileron text-[11px] font-semibold text-[#94A3B8]">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const d = sod(cell.date);
          const isStart = start ? sameDay(d, sod(start)) : false;
          const isEnd = effEnd ? sameDay(d, sod(effEnd)) : false;
          const inRange = lo && hi ? d > lo && d < hi : false;
          const isSelected = isStart || isEnd;
          const hasRange = isStart || isEnd || inRange;

          return (
            <div key={i} className="relative flex h-9 items-center justify-center">
              {/* Range background strip */}
              {cell.current && hasRange && (
                <div
                  className={[
                    "absolute inset-y-[4px] bg-[#EEF4FF]",
                    isStart && isEnd ? "inset-x-0 rounded-full" :
                    isStart ? "left-1/2 right-0" :
                    isEnd ? "left-0 right-1/2" :
                    "inset-x-0",
                  ].join(" ")}
                />
              )}
              <button
                type="button"
                onClick={() => cell.current && onDay(cell.date)}
                onMouseEnter={() => cell.current && onHover(cell.date)}
                onMouseLeave={() => onHover(null)}
                className={[
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full font-aileron text-[13px] transition-colors",
                  !cell.current
                    ? "cursor-default text-[#CBD5E1]"
                    : isSelected
                    ? "cursor-pointer bg-[#0066CC] font-semibold text-white hover:bg-[#0055B3]"
                    : "cursor-pointer text-[#202830] hover:bg-[#DBEAFE]",
                ].join(" ")}
              >
                {cell.date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ value, onChange, joinedRight }: Props) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const [picking, setPicking] = useState<"start" | "end">("start");

  // Left calendar state
  const [lYear, setLYear] = useState(() => (value.start ?? new Date()).getFullYear());
  const [lMonth, setLMonth] = useState(() => (value.start ?? new Date()).getMonth());
  // Right calendar state (default: left + 1 month)
  const [rYear, setRYear] = useState(() => {
    const d = value.start ?? new Date();
    return d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  });
  const [rMonth, setRMonth] = useState(() => {
    const d = value.start ?? new Date();
    return d.getMonth() === 11 ? 0 : d.getMonth() + 1;
  });

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const openPicker = () => {
    setTempStart(value.start);
    setTempEnd(value.end);
    setPicking("start");
    if (value.start) {
      setLYear(value.start.getFullYear());
      setLMonth(value.start.getMonth());
    }
    setOpen(true);
  };

  const handleDay = (d: Date) => {
    if (picking === "start") {
      setTempStart(d);
      setTempEnd(null);
      setPicking("end");
    } else {
      const s = tempStart!;
      if (sod(d) < sod(s)) {
        setTempStart(d);
        setTempEnd(s);
      } else {
        setTempEnd(d);
      }
      setPicking("start");
    }
  };

  const apply = () => {
    if (tempStart && tempEnd) onChange({ start: tempStart, end: tempEnd });
    setOpen(false);
  };

  // Left calendar nav
  const lPrevM = () => { if (lMonth === 0) { setLMonth(11); setLYear(y => y - 1); } else setLMonth(m => m - 1); };
  const lNextM = () => { if (lMonth === 11) { setLMonth(0); setLYear(y => y + 1); } else setLMonth(m => m + 1); };
  const lPrevY = () => setLYear(y => y - 1);
  const lNextY = () => setLYear(y => y + 1);
  // Right calendar nav
  const rPrevM = () => { if (rMonth === 0) { setRMonth(11); setRYear(y => y - 1); } else setRMonth(m => m - 1); };
  const rNextM = () => { if (rMonth === 11) { setRMonth(0); setRYear(y => y + 1); } else setRMonth(m => m + 1); };
  const rPrevY = () => setRYear(y => y - 1);
  const rNextY = () => setRYear(y => y + 1);

  const btnLabel = value.start && value.end
    ? `${fmtShortDate(value.start)} – ${fmtShortDate(value.end)}`
    : "Filter by Date";

  const rangeLabel = tempStart
    ? tempEnd
      ? `${fmtShortDate(tempStart)} - ${fmtShortDate(tempEnd)}`
      : `${fmtShortDate(tempStart)} - ...`
    : "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPicker}
        className={[
          "h-10 min-w-[160px] bg-background px-3 text-left font-aileron text-[14px] focus:outline-none whitespace-nowrap border border-[#E2E8F0]",
          joinedRight
            ? "rounded-r-[5px] rounded-l-none"
            : "rounded-[5px]",
          value.start ? "text-[#202830]" : "text-[#94A3B8]",
        ].join(" ")}
      >
        {btnLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-[8px] border border-[#E2E8F0] bg-white shadow-2xl">
          <div className="flex divide-x divide-[#E2E8F0]">
            <MonthCalendar
              year={lYear} month={lMonth}
              start={tempStart} end={tempEnd} hover={hover}
              onDay={handleDay} onHover={setHover}
              onPrevY={lPrevY} onNextY={lNextY} onPrevM={lPrevM} onNextM={lNextM}
            />
            <MonthCalendar
              year={rYear} month={rMonth}
              start={tempStart} end={tempEnd} hover={hover}
              onDay={handleDay} onHover={setHover}
              onPrevY={rPrevY} onNextY={rNextY} onPrevM={rPrevM} onNextM={rNextM}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={apply}
                disabled={!tempStart || !tempEnd}
                className="h-9 rounded-[5px] px-4 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[13px] disabled:opacity-50"
              >
                Apply Filter <ArrowRight className="ml-1 h-3.5 w-3.5 shrink-0" />
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-[5px] border border-[#E2E8F0] px-4 font-aileron text-[13px] text-[#202830] hover:bg-[#F7F8F9] transition-colors"
              >
                Cancel
              </button>
            </div>
            <span className="font-aileron text-[13px] text-[#64748B]">{rangeLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
