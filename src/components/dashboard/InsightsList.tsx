import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { SkeletonText } from '../ui/Skeleton';

export interface InsightsListProps {
  insights: string[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export const InsightsList: React.FC<InsightsListProps> = ({
  insights,
  isLoading = false,
  error = null,
  emptyMessage = 'No insights available yet.',
}) => {
  if (isLoading) {
    return (
      <div data-testid="insights-loading" className="space-y-3" aria-busy="true" aria-live="polite">
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="insights-error"
        role="alert"
        className="flex items-center gap-2 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm"
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div
        data-testid="insights-empty"
        className="flex items-center gap-2 p-4 rounded-xl border border-border/20 text-muted-foreground text-sm"
      >
        <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <ul data-testid="insights-list" className="space-y-2">
      {insights.map((insight, index) => (
        <li
          key={index}
          className="text-sm text-foreground p-3 rounded-lg glass border border-border/20"
        >
          {insight}
        </li>
      ))}
    </ul>
  );
};
