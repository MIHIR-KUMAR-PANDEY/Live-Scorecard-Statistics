import { useEffect, useRef, useState } from 'react';
import { formatValue } from '../lib/medianEngine';
import { HeapsTreeIcon } from './StadiumIcons';

interface LedMedianPanelProps {
  median: number | null;
  mean: number | null;
  count: number;
  min: number | null;
  max: number | null;
  lastSwaps: number;
  loRoot: number | null;
  loSize: number;
  hiRoot: number | null;
  hiSize: number;
  enlarged?: boolean;
}

export function LedMedianPanel({
  median,
  mean,
  count,
  min,
  max,
  lastSwaps,
  loRoot,
  loSize,
  hiRoot,
  hiSize,
  enlarged = false,
}: LedMedianPanelProps) {
  const [flipKey, setFlipKey] = useState(0);
  const prevMedRef = useRef<number | null>(median);

  useEffect(() => {
    if (prevMedRef.current !== median) {
      prevMedRef.current = median;
      setFlipKey((k) => k + 1);
    }
  }, [median]);

  const balancePct = count ? (loSize / count) * 100 : 50;
  const formattedMed = formatValue(median);

  return (
    <section
      aria-live="polite"
      className="scoreboard-panel panel-grid-bg flex flex-col justify-between overflow-hidden"
    >
      {/* Header strip */}
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <HeapsTreeIcon className="w-4 h-4 text-[var(--med)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Official Live Median
          </h2>
        </div>
        <span className="text-xs text-[var(--mut)] font-mono-data tabular-nums">
          O(1) Root Read · {count.toLocaleString('en-US')} scores
        </span>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        {/* Metallic LED Panel with Bezel, Screws, Scanlines */}
        <div
          className="relative rounded-[6px] p-2.5 sm:p-3 border border-slate-600/60 shadow-inner"
          style={{
            background:
              'linear-gradient(145deg, #2a3346 0%, #161d2b 55%, #0e131e 100%)',
          }}
        >
          {/* 4 CSS corner screws */}
          <div className="led-screw absolute top-1.5 left-1.5" aria-hidden="true" />
          <div className="led-screw absolute top-1.5 right-1.5" aria-hidden="true" />
          <div className="led-screw absolute bottom-1.5 left-1.5" aria-hidden="true" />
          <div className="led-screw absolute bottom-1.5 right-1.5" aria-hidden="true" />

          {/* Inner Near-Black LED Screen */}
          <div className="relative bg-[#05080F] border border-black/80 rounded-[4px] px-4 py-4 sm:py-5 overflow-hidden">
            <div
              className="led-scanlines absolute inset-0 pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative flex items-baseline justify-between gap-3 flex-wrap">
              <span className="text-[11px] font-mono-data tracking-widest text-amber-300/75">
                CURRENT MEDIAN
              </span>
              <span className="text-[11px] font-mono-data text-[var(--med)]">
                {count === 0
                  ? 'AWAITING INPUT'
                  : count % 2 === 1
                  ? 'ODD · LOWER ROOT'
                  : 'EVEN · MEAN OF ROOTS'}
              </span>
            </div>

            <div
              key={flipKey}
              id="med"
              className={`relative mt-1 font-led font-bold tabular-nums break-all leading-none animate-led-flip ${
                enlarged
                  ? 'text-[56px] sm:text-[84px]'
                  : 'text-[44px] sm:text-[64px]'
              }`}
              style={{
                color: median === null ? '#64748b' : '#FFE4A3',
                textShadow:
                  median === null
                    ? 'none'
                    : '0 0 18px rgba(255, 90, 154, 0.45), 0 0 8px rgba(240, 169, 58, 0.55)',
              }}
            >
              {formattedMed}
            </div>
          </div>
        </div>

        {/* Telemetry Readout Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div>
            <span className="block text-[11px] text-[var(--mut)]">
              Scores received
            </span>
            <strong
              id="cnt"
              className="text-lg font-bold tabular-nums font-mono-data"
            >
              {count.toLocaleString('en-US')}
            </strong>
          </div>
          <div>
            <span className="block text-[11px] text-[var(--mut)]">
              Running mean
            </span>
            <strong className="text-lg font-bold tabular-nums font-mono-data text-[var(--mean)]">
              {formatValue(mean)}
            </strong>
          </div>
          <div>
            <span className="block text-[11px] text-[var(--mut)]">
              Smallest
            </span>
            <strong
              id="mn"
              className="text-lg font-bold tabular-nums font-mono-data"
            >
              {formatValue(min)}
            </strong>
          </div>
          <div>
            <span className="block text-[11px] text-[var(--mut)]">
              Largest
            </span>
            <strong
              id="mx"
              className="text-lg font-bold tabular-nums font-mono-data"
            >
              {formatValue(max)}
            </strong>
          </div>
          <div>
            <span className="block text-[11px] text-[var(--mut)]">
              Heap swaps (last)
            </span>
            <strong
              id="sw"
              className="text-lg font-bold tabular-nums font-mono-data"
            >
              {lastSwaps}
            </strong>
          </div>
        </div>

        {/* Lower & Upper Heap Root Panels + Balance Bar */}
        <div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[4px] p-3 border-2 border-[var(--lo)] bg-[var(--bg)]/50">
              <small className="block text-[11px] text-[var(--mut)]">
                Lower half · max-heap
              </small>
              <strong
                id="lt"
                className="block text-xl sm:text-2xl font-bold tabular-nums font-mono-data my-0.5 text-[var(--lo)]"
              >
                {formatValue(loRoot)}
              </strong>
              <small
                id="ls"
                className="block text-xs text-[var(--mut)] tabular-nums"
              >
                {loSize.toLocaleString('en-US')} scores
              </small>
            </div>

            <div className="rounded-[4px] p-3 border-2 border-[var(--hi)] bg-[var(--bg)]/50">
              <small className="block text-[11px] text-[var(--mut)]">
                Upper half · min-heap
              </small>
              <strong
                id="ht"
                className="block text-xl sm:text-2xl font-bold tabular-nums font-mono-data my-0.5 text-[var(--hi)]"
              >
                {formatValue(hiRoot)}
              </strong>
              <small
                id="hs"
                className="block text-xs text-[var(--mut)] tabular-nums"
              >
                {hiSize.toLocaleString('en-US')} scores
              </small>
            </div>
          </div>

          <div
            className="h-2.5 rounded-[3px] bg-[var(--hi)] mt-2.5 overflow-hidden border border-[var(--line)]"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[var(--lo)] transition-[width] duration-200"
              style={{ width: `${balancePct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
