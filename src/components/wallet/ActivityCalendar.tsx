'use client';

import { useMemo } from 'react';
import { WalletActivityDay } from '@/lib/analytics-api';

interface ActivityCalendarProps {
  activity: WalletActivityDay[];
  address: string;
}

/** Map a transaction count to a CSS background-color token */
function countToIntensity(count: number): string {
  if (count === 0) return 'bg-white/5';
  if (count === 1) return 'bg-accent/20';
  if (count <= 3) return 'bg-accent/50';
  if (count <= 5) return 'bg-accent/75';
  return 'bg-accent';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ActivityCalendar({ activity, address }: ActivityCalendarProps) {
  const { weeks, monthPositions, totalTxns, activeDays } = useMemo(() => {
    // Build a lookup by date string
    const byDate = new Map<string, number>();
    for (const d of activity) {
      byDate.set(d.date, d.count);
    }

    // Determine the range: last 52 weeks ending today
    const today = new Date();
    // Rewind to the start of this week (Sunday)
    const endSunday = new Date(today);
    endSunday.setDate(today.getDate() - today.getDay());

    const startDate = new Date(endSunday);
    startDate.setDate(endSunday.getDate() - 51 * 7);

    // Build week columns, each an array of 7 days (Sun→Sat)
    const allWeeks: { date: string; count: number; dayOfWeek: number }[][] = [];
    const cursor = new Date(startDate);
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

    while (cursor <= endSunday) {
      const dateStr = cursor.toISOString().split('T')[0];
      currentWeek.push({
        date: dateStr,
        count: byDate.get(dateStr) ?? 0,
        dayOfWeek: cursor.getDay(),
      });
      if (cursor.getDay() === 6) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) allWeeks.push(currentWeek);

    // Month label positions: find the first week where a new month starts
    const seen = new Set<number>();
    const positions: { label: string; col: number }[] = [];
    allWeeks.forEach((week, col) => {
      const month = new Date(week[0].date).getMonth();
      if (!seen.has(month)) {
        seen.add(month);
        positions.push({ label: MONTH_LABELS[month], col });
      }
    });

    const totalTxns = activity.reduce((s, d) => s + d.count, 0);
    const activeDays = activity.filter((d) => d.count > 0).length;

    return { weeks: allWeeks, monthPositions: positions, totalTxns, activeDays };
  }, [activity]);

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
            Wallet Analytics // 04.B
          </div>
          <h2 className="text-xl font-black tracking-tighter uppercase italic mb-1">
            Activity Calendar
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {address.slice(0, 8)}...{address.slice(-8)} · last 52 weeks
          </p>
        </div>
        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/40 border border-white/5 text-center">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Transactions</p>
            <p className="text-base font-black font-mono text-accent">{totalTxns}</p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/40 border border-white/5 text-center">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Active Days</p>
            <p className="text-base font-black font-mono text-emerald-400">{activeDays}</p>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels row */}
          <div className="flex mb-1" style={{ paddingLeft: '20px' }}>
            {weeks.map((_, col) => {
              const mp = monthPositions.find((p) => p.col === col);
              return (
                <div key={col} className="w-3 mr-0.5 text-[8px] font-mono text-muted-foreground/60 uppercase">
                  {mp ? mp.label : ''}
                </div>
              );
            })}
          </div>

          {/* Day-of-week labels + cell grid */}
          <div className="flex gap-0">
            {/* Day labels column */}
            <div className="flex flex-col mr-1 gap-0.5" aria-hidden="true">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={i}
                  className="w-3 h-3 text-[8px] font-mono text-muted-foreground/40 flex items-center justify-center"
                >
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-0.5 mr-0.5">
                {/* Pad incomplete first week */}
                {col === 0 && week[0].dayOfWeek > 0
                  ? Array.from({ length: week[0].dayOfWeek }).map((_, p) => (
                      <div key={`pad-${p}`} className="w-3 h-3" />
                    ))
                  : null}
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-3 h-3 rounded-sm ${countToIntensity(day.count)} transition-opacity hover:opacity-80 cursor-default`}
                    title={`${day.date}: ${day.count} transaction${day.count !== 1 ? 's' : ''}`}
                    aria-label={`${day.date}: ${day.count} transactions`}
                    role="img"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 justify-end">
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Less</span>
        {['bg-white/5', 'bg-accent/20', 'bg-accent/50', 'bg-accent/75', 'bg-accent'].map((cls) => (
          <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} aria-hidden="true" />
        ))}
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">More</span>
      </div>
    </div>
  );
}
