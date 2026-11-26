import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { formatValue } from '../lib/medianEngine';
import { BarChartIcon } from './StadiumIcons';

interface MedianVsMeanPanelProps {
  meds: number[];
  means: number[];
  currentMedian: number | null;
  currentMean: number | null;
  onInjectOutlier: () => void;
}

const slog = (v: number) => Math.sign(v) * Math.log10(1 + Math.abs(v));

export function MedianVsMeanPanel({
  meds,
  means,
  currentMedian,
  currentMean,
  onInjectOutlier,
}: MedianVsMeanPanelProps) {
  const verdict = useMemo(() => {
    if (currentMedian === null || currentMean === null) {
      return 'Add scores or click "Inject outlier" to see how an extreme score pulls the average while the median holds steady.';
    }
    const diff = currentMean - currentMedian;
    const absDiff = Math.abs(diff);
    if (absDiff < 0.5) {
      return 'Mean and median are aligned within 0.5 points.';
    }
    const dir = diff > 0 ? 'above' : 'below';
    return `Mean is pulled ${formatValue(
      Math.round(absDiff * 10) / 10
    )} ${dir} the median by extreme scores.`;
  }, [currentMedian, currentMean]);

  const chart = useMemo(() => {
    const n = meds.length;
    if (!n) return null;

    const W = 900;
    const H = 210;
    const P = 34;

    const step = Math.max(1, Math.ceil(n / 260));
    const idx: number[] = [];
    for (let i = 0; i < n; i += step) idx.push(i);
    if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);

    let lo = Infinity;
    let hi = -Infinity;
    for (const i of idx) {
      for (const v of [meds[i], means[i]]) {
        const y = slog(v);
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }

    const X = (i: number) => P + (n === 1 ? 0.5 : i / (n - 1)) * (W - 2 * P);
    const Y = (v: number) => H - P - ((slog(v) - lo) / (hi - lo)) * (H - 2 * P);

    const medPts = idx.map((i) => ({ x: X(i), y: Y(meds[i]) }));
    const meanPts = idx.map((i) => ({ x: X(i), y: Y(means[i]) }));

    const medPath = medPts
      .map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join('');
    const meanPath = meanPts
      .map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join('');

    const gapPolygon =
      medPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ' ' +
      meanPts
        .slice()
        .reverse()
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' ');

    return {
      W,
      H,
      P,
      medPath,
      meanPath,
      gapPolygon,
      hasZero: lo < 0 && hi > 0,
      zeroY: Y(0),
    };
  }, [meds, means]);

  return (
    <section
      id="median-vs-mean-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-[var(--med)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Median vs. Mean (Why Averages Mislead)
          </h2>
        </div>

        <button
          type="button"
          onClick={onInjectOutlier}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-[var(--mean)] text-white border border-[var(--mean)] whitespace-nowrap shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          Inject outlier
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 tabular-nums">
            <div>
              <span className="block text-[11px] text-[var(--mut)]">
                Running median
              </span>
              <strong className="text-2xl font-bold font-mono-data text-[var(--med)]">
                {formatValue(currentMedian)}
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-[var(--mut)]">
                Running mean (O(1) sum/count)
              </span>
              <strong className="text-2xl font-bold font-mono-data text-[var(--mean)]">
                {formatValue(currentMean)}
              </strong>
            </div>
          </div>

          <p className="text-sm font-medium text-[var(--ink)] m-0 px-3 py-2 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]">
            {verdict}
          </p>
        </div>

        <svg
          viewBox="0 0 900 210"
          className="w-full h-auto block"
          role="img"
          aria-label="Dual-line chart comparing running median and running mean"
        >
          {!chart ? (
            <text
              x="450"
              y="108"
              textAnchor="middle"
              fill="currentColor"
              opacity="0.5"
              fontSize="13"
            >
              Median vs. mean gap appears after the first score
            </text>
          ) : (
            <>
              {chart.hasZero && (
                <line
                  x1={chart.P}
                  x2={chart.W - chart.P}
                  y1={chart.zeroY}
                  y2={chart.zeroY}
                  stroke="currentColor"
                  opacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              <polygon
                points={chart.gapPolygon}
                fill="var(--mean)"
                opacity="0.14"
              />
              <path
                d={chart.meanPath}
                fill="none"
                stroke="var(--mean)"
                strokeWidth="2.2"
                strokeDasharray="6 4"
              />
              <path
                d={chart.medPath}
                fill="none"
                stroke="var(--med)"
                strokeWidth="2.8"
              />
            </>
          )}
        </svg>

        <p className="text-xs text-[var(--mut)] m-0">
          <span className="text-[var(--med)] font-semibold">━</span> Running median{' '}
          <span className="text-[var(--mean)] font-semibold ml-3">╍</span> Running mean{' '}
          <span className="ml-3">· Shaded area shows distortion caused by outliers (signed-log y-axis).</span>
        </p>
      </div>
    </section>
  );
}
