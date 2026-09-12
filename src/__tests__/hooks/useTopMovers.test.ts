import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTopMovers } from '@/hooks/useTopMovers';

vi.mock('@/config', () => ({
  config: { apiUrl: 'https://api.test.local', appEnv: 'test', stellarNetwork: 'testnet' },
}));

const mockResponse = {
  movers: [
    {
      asset_code: 'XLM',
      asset_issuer: null,
      price: 0.12,
      price_change_pct: 8.4,
      volume_24h_usd: 1_500_000,
      rank: 1,
    },
  ],
  generated_at: '2026-07-22T00:00:00Z',
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useTopMovers', () => {
  it('starts in a loading state with no movers', () => {
    const { result } = renderHook(() => useTopMovers());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.movers).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches and returns typed ranking data on mount', async () => {
    const { result } = renderHook(() => useTopMovers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.movers).toEqual(mockResponse.movers);
    expect(result.current.generatedAt).toBe(mockResponse.generated_at);
    expect(result.current.error).toBeNull();
  });

  it('requests the backend rankings endpoint with limit and direction', async () => {
    renderHook(() => useTopMovers({ limit: 5, direction: 'gainers' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toBe(
      'https://api.test.local/api/v1/rankings/top-movers?limit=5&direction=gainers',
    );
  });

  it('surfaces an error and keeps movers empty on failure', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useTopMovers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('API error: 500');
    expect(result.current.movers).toEqual([]);
  });

  it('refetch() re-requests the endpoint', async () => {
    const { result } = renderHook(() => useTopMovers());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
