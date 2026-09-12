import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InsightsList } from '../InsightsList';

describe('InsightsList', () => {
  it('renders a loading state and no insight content while loading', () => {
    render(<InsightsList insights={[]} isLoading />);

    expect(screen.getByTestId('insights-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('insights-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('insights-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('insights-empty')).not.toBeInTheDocument();
  });

  it('renders an error state with the provided message', () => {
    render(<InsightsList insights={[]} error="Failed to load insights" />);

    const errorEl = screen.getByTestId('insights-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('Failed to load insights');
    expect(errorEl).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('insights-list')).not.toBeInTheDocument();
  });

  it('prioritizes the loading state over the error state when both are set', () => {
    render(<InsightsList insights={[]} isLoading error="Backend unavailable" />);

    expect(screen.getByTestId('insights-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('insights-error')).not.toBeInTheDocument();
  });

  it('renders the default empty message when there are no insights', () => {
    render(<InsightsList insights={[]} />);

    const emptyEl = screen.getByTestId('insights-empty');
    expect(emptyEl).toBeInTheDocument();
    expect(emptyEl).toHaveTextContent('No insights available yet.');
  });

  it('renders a custom empty message when provided', () => {
    render(<InsightsList insights={[]} emptyMessage="This asset has no history yet." />);

    expect(screen.getByTestId('insights-empty')).toHaveTextContent(
      'This asset has no history yet.'
    );
  });

  it('renders each insight string on the happy path', () => {
    const insights = [
      'Settlement speed improved by 12% this week',
      'Liquidity depth is stable across top corridors',
      'Governance proposal #42 passed with 78% approval',
    ];

    render(<InsightsList insights={insights} />);

    const list = screen.getByTestId('insights-list');
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(insights.length);

    insights.forEach((insight) => {
      expect(screen.getByText(insight)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('insights-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('insights-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('insights-empty')).not.toBeInTheDocument();
  });
});
