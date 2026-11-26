import { useMemo } from 'react';
import { QuartileStats, formatValue } from '../lib/medianEngine';
import { BarChartIcon, MedalIcon } from './StadiumIcons';

interface OutlierStatsStripProps {
  stats: QuartileStats;
  outlierCount: number;
  reservoir: number[];
}

export function OutlierStatsStrip({
  stats,
  outlierCount,
  reservoir,
}: OutlierStatsStripProps) {
  const bins = useMemo(() => {
    if (reservoir.length < 2) return null;

    // Build 20-bin distribution histogram using signed-log transform when range is huge, or linear when compact
    let minV = Infinity;
    let maxV = -Infinity;
    for (const v of reservoir) {
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    if (minV === maxV) {
      return {
        useSlog: false,
        counts: [reservoir.length],
        binOutliers: [false],
        minLabel: formatValue(minV),
        maxLabel: formatValue(maxV),
      };
    }

    const useSlog = maxV - minV > 50000;
    const tx = (v: number) =>
      useSlog ? Math.sign(v) * Math.log10(1 + Math.abs(v)) : v;

    const lo = tx(minV);
    const hi = tx(maxV);
    const span = hi - lo || 1;
    const NUM_BINS = 20;
    const counts = new Array<number>(NUM_BINS).fill(0);
    const binOutliers = new Array<boolean>(NUM_BINS).fill(false);

    for (const v of reservoir) {
      const norm = (tx(v) - lo) / span;
      const idx = Math.min(NUM_BINS - 1, Math.max(0, Math.floor(norm * NUM_BINS)));
      counts[idx]++;
      if (
        stats.lowerFence !== null &&
        stats.upperFence !== null &&
        (v < stats.lowerFence || v > stats.upperFence)
      ) {
        binOutliers[idx] = true;
      }
    }

    return {
      useSlog,
      counts,
      binOutliers,
      minLabel: formatValue(minV),
      maxLabel: formatValue(maxV),
    };
  }, [reservoir, stats.lowerFence, stats.upperFence]);

  const maxBin = bins ? Math.max(...bins.counts, 1) : 1;

  return (
    <section
      id="outlier-stats-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-[var(--hi)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Outlier & Distribution Strip (1.5 × IQR Rule)
          </h2>
        </div>
        <span className="text-xs text-[var(--mut)] tabular-nums">
          {stats.isSampled
            ? `Estimated from ${stats.sampleSize.toLocaleString('en-US')}-score uniform reservoir sample (no full sort)`
            : `Order-statistic quartiles on ${stats.sampleSize.toLocaleString('en-US')} scores`}
        </span>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Q1 / Median / Q3 / IQR / Outliers */}
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
          <div className="p-2.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--mut)] mb-0.5">
              <MedalIcon tier="bronze" className="w-3.5 h-3.5" />
              <span>Q1 (25%)</span>
            </div>
            <strong className="text-base font-bold font-mono-data">
              {formatValue(stats.q1)}
            </strong>
          </div>

          <div className="p-2.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--mut)] mb-0.5">
              <MedalIcon tier="gold" className="w-3.5 h-3.5" />
              <span>Median</span>
            </div>
            <strong className="text-base font-bold font-mono-data text-[var(--med)]">
              {formatValue(stats.median)}
            </strong>
          </div>

          <div className="p-2.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--mut)] mb-0.5">
              <MedalIcon tier="silver" className="w-3.5 h-3.5" />
              <span>Q3 (75%)</span>
            </div>
            <strong className="text-base font-bold font-mono-data">
              {formatValue(stats.q3)}
            </strong>
          </div>

          <div className="p-2.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60">
            <span className="block text-[11px] text-[var(--mut)] mb-0.5">
              IQR (Q3−Q1)
            </span>
            <strong className="text-base font-bold font-mono-data">
              {formatValue(stats.iqr)}
            </strong>
          </div>

          <div className="p-2.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60">
            <span className="block text-[11px] text-[var(--mut)] mb-0.5">
              Outliers
            </span>
            <strong className="text-base font-bold font-mono-data text-[var(--bad)]">
              {outlierCount.toLocaleString('en-US')}
            </strong>
          </div>
        </div>

        {/* Live 20-Bin Distribution Histogram */}
        <div className="lg:col-span-6">
          <div className="flex items-center justify-between text-[11px] text-[var(--mut)] mb-1">
            <span>20-bin score distribution {bins?.useSlog ? '(signed-log bins)' : ''}</span>
            <span className="font-mono-data">
              {bins ? `${bins.minLabel} → ${bins.maxLabel}` : 'Needs ≥ 2 scores'}
            </span>
          </div>
          <svg
            viewBox="0 0 400 76"
            className="w-full h-auto block border border-[var(--line)] rounded-[4px] bg-[var(--bg)]/50 p-1"
            role="img"
            aria-label="20-bin histogram of score distribution"
          >
            {!bins ? (
              <text
                x="200"
                y="42"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.45"
                fontSize="11"
              >
                Histogram appears at ≥ 2 scores
              </text>
            ) : (
              bins.counts.map((c, idx) => {
                const barW = 380 / bins.counts.length;
                const h = Math.max(c > 0 ? 3 : 0, (c / maxBin) * 60);
                const x = 10 + idx * barW + 1;
                const y = 68 - h;
                return (
                  <rect
                    key={idx}
                    x={x}
                    y={y}
                    width={Math.max(2, barW - 2)}
                    height={h}
                    rx="1.5"
                    fill={bins.binOutliers[idx] ? 'var(--bad)' : 'var(--lo)'}
                    opacity={c > 0 ? 0.85 : 0.1}
                  />
                );
              })
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}
