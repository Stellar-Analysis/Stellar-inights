import React from 'react';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/ui/DataTablePagination';

interface TopAsset {
  asset: string;
  volume: number;
  tvl: number;
  /** Top-movers mode only: current price in USD. */
  price?: number;
  /** Top-movers mode only: 24h % change, or `null` with no 24h-ago baseline. */
  change?: number | null;
  /** Top-movers mode only: new unique holders gained in the last 24h. */
  newHolders24h?: number;
}

interface TopAssetsCardProps {
  assets: TopAsset[];
  mode?: 'default' | 'top-movers';
  title?: string;
}

export function TopAssetsCard({ assets, mode = 'default', title }: TopAssetsCardProps) {
  const {
    currentPage,
    pageSize,
    onPageChange,
    onPageSizeChange,
    startIndex,
    endIndex,
  } = usePagination(assets.length, 10);

  const paginatedAssets = assets.slice(startIndex, endIndex);

  return (
    <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          {title ?? (mode === 'top-movers' ? 'Top Movers (24h)' : 'Top-performing Assets')}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400 text-xs uppercase bg-slate-950/50">
            <tr>
              <th className="px-6 py-3 font-medium">Asset</th>
              {mode === 'top-movers' ? (
                <>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                  <th className="px-6 py-3 font-medium text-right">24h</th>
                  <th className="px-6 py-3 font-medium text-right">New Holders</th>
                  <th className="px-6 py-3 font-medium text-right">Volume</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 font-medium text-right">Volume</th>
                  <th className="px-6 py-3 font-medium text-right">TVL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={mode === 'top-movers' ? 5 : 3} className="px-6 py-8 text-center text-slate-500">
                  No assets found.
                </td>
              </tr>
            ) : (
              paginatedAssets.map((a) => {
                if (mode === 'top-movers') {
                  const hasChange = typeof a.change === 'number';
                  const isPositive = hasChange && (a.change as number) >= 0;

                  return (
                    <tr key={a.asset} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{a.asset}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{a.price?.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? '—'}</td>
                      <td
                        className={`px-6 py-4 text-right font-medium ${
                          hasChange ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-slate-500'
                        }`}
                      >
                        {hasChange
                          ? `${isPositive ? '+' : ''}${(a.change as number).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">
                        {a.newHolders24h !== undefined ? `+${a.newHolders24h.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">${a.volume.toLocaleString()}</td>
                    </tr>
                  );
                }

                return (
                  <tr key={a.asset} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{a.asset}</td>
                    <td className="px-6 py-4 text-right text-slate-300">{a.volume.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-300">${a.tvl.toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {assets.length > 0 && (
        <DataTablePagination
          totalItems={assets.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
