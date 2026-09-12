'use client';

import { useMemo, useRef, useState } from 'react';
import { ActivityDay } from '@/lib/analytics-api';
import { ChartExportButton } from './ChartExportButton';

interface ActivityCalendarHeatmapProps {
  data: ActivityDay[];
  address: string;
}

interface DayCell {
  date: string;
  count: number;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function intensityClass(count: number, max: number): string {
  if (count === 0) return 'bg-slate-900/40 border-white/5';
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return 'bg-accent border-accent';
  if (ratio > 0.5) return 'bg-accent/70 border-accent/70';
  if (ratio > 0.25) return 'bg-accent/40 border-accent/40';
  return 'bg-accent/20 border-accent/20';
}

export function ActivityCalendarHeatmap({ data, address }: ActivityCalendarHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<DayCell | null>(null);

  const { weeks, maxCount, totalCount, activeDays, currentStreak } = useMemo(() => {
    // The backend reports UTC calendar days, so all date arithmetic here
    // must stay in UTC too -- mixing UTC date strings with local-timezone
    // Date methods (getDay/setDate) shifts the grid by a day for users not
    // in UTC, especially around DST transitions.
    const countByDate = new Map(data.map((d) => [d.date, d.count]));

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const earliestDate = data.length
      ? data.reduce((min, d) => (d.date < min ? d.date : min), data[0].date)
      : today.toISOString().slice(0, 10);

    const start = new Date(earliestDate);
    // Align the grid to the preceding Sunday so weeks line up as full columns.
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());

    const end = new Date(today);
    // Pad out to the following Saturday so every week column is complete.
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

    const days: DayCell[] = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, count: countByDate.get(iso) ?? 0 });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const max = Math.max(0, ...data.map((d) => d.count));
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const active = data.filter((d) => d.count > 0).length;

    let streak = 0;
    for (let d = new Date(today); ; d.setUTCDate(d.getUTCDate() - 1)) {
      const iso = d.toISOString().slice(0, 10);
      if ((countByDate.get(iso) ?? 0) > 0) {
        streak += 1;
      } else {
        break;
      }
    }

    return { weeks, maxCount: max, totalCount: total, activeDays: active, currentStreak: streak };
  }, [data]);

  return (
    <div ref={chartRef} className="glass-card rounded-2xl p-6 border border-border/50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">Wallet Analytics // 04.B</div>
          <h2 className="text-xl font-black tracking-tighter uppercase italic mb-2">
            Activity Calendar
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-6">
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
        <ChartExportButton chartRef={chartRef} chartName="Activity Calendar" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Transactions
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-emerald-400">
            {totalCount.toLocaleString()}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Active Days
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-foreground/80">
            {activeDays.toLocaleString()}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Current Streak
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-accent">
            {currentStreak}d
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No activity recorded for this address yet.
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex gap-2">
              <div className="flex flex-col gap-[3px] justify-around pt-4 pr-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className={`text-[8px] font-mono text-muted-foreground uppercase h-[11px] leading-[11px] ${i % 2 === 0 ? '' : 'opacity-0'}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      role="gridcell"
                      aria-label={`${day.date}: ${day.count} transactions`}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                      className={`w-[11px] h-[11px] rounded-[2px] border ${intensityClass(day.count, maxCount)} transition-all hover:ring-1 hover:ring-white/40`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider h-4">
              {hovered ? `${hovered.date} — ${hovered.count} tx` : ' '}
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground uppercase">
              <span>Less</span>
              <div className="w-[10px] h-[10px] rounded-[2px] bg-slate-900/40 border border-white/5" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent/20 border border-accent/20" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent/40 border border-accent/40" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent/70 border border-accent/70" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-accent border border-accent" />
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
