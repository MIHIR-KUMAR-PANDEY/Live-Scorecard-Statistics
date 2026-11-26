import { useMemo, useState } from 'react';
import { formatValue } from '../lib/medianEngine';
import { BarChartIcon } from './StadiumIcons';

interface MedianChartProps {
  scores: number[];
  meds: number[];
  judges: (number | null)[];
  outlierFlags: boolean[];
  judgeCount: number;
  selectedJudge: number | 'all';
  onSelectJudge: (val: number | 'all') => void;
  enlarged?: boolean;
}

const slog = (v: number) => Math.sign(v) * Math.log10(1 + Math.abs(v));

export function MedianChart({
  scores,
  meds,
  judges,
  outlierFlags,
  judgeCount,
  selectedJudge,
  onSelectJudge,
  enlarged = false,
}: MedianChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const n = scores.length;
    if (!n) return null;

    const W = 900;
    const H = enlarged ? 300 : 250;
    const P = 34;

    const matchingIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (selectedJudge === 'all' || judges[i] === selectedJudge) {
        matchingIndices.push(i);
      }
    }

    const step = Math.max(1, Math.ceil(n / 300));
    const lineIdx: number[] = [];
    for (let i = 0; i < n; i += step) lineIdx.push(i);
    if (lineIdx[lineIdx.length - 1] !== n - 1) lineIdx.push(n - 1);

    const dotStep = Math.max(1, Math.ceil(matchingIndices.length / 300));
    const dotIdx: number[] = [];
    for (let k = 0; k < matchingIndices.length; k += dotStep) {
      dotIdx.push(matchingIndices[k]);
    }
    if (
      matchingIndices.length > 0 &&
      dotIdx[dotIdx.length - 1] !== matchingIndices[matchingIndices.length - 1]
    ) {
      dotIdx.push(matchingIndices[matchingIndices.length - 1]);
    }

    let lo = Infinity;
    let hi = -Infinity;
    for (const i of lineIdx) {
      const yMed = slog(meds[i]);
      const yScore = slog(scores[i]);
      lo = Math.min(lo, yMed, yScore);
      hi = Math.max(hi, yMed, yScore);
    }
    for (const i of dotIdx) {
      const yScore = slog(scores[i]);
      lo = Math.min(lo, yScore);
      hi = Math.max(hi, yScore);
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }

    const X = (i: number) => P + (n === 1 ? 0.5 : i / (n - 1)) * (W - 2 * P);
    const Y = (v: number) => H - P - ((slog(v) - lo) / (hi - lo)) * (H - 2 * P);

    const hasZeroLine = lo < 0 && hi > 0;
    const zeroY = Y(0);

    const dots = dotIdx.map((i) => {
      const scoreVal = scores[i];
      const medVal = meds[i];
      const isOutlier = outlierFlags[i];
      const isUpper = scoreVal > medVal;
      return {
        index: i,
        x: X(i),
        scoreY: Y(scoreVal),
        medY: Y(medVal),
        scoreVal,
        medVal,
        judge: judges[i],
        isOutlier,
        isUpper,
      };
    });

    const pathD = lineIdx
      .map(
        (i, k) =>
          `${k ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(meds[i]).toFixed(1)}`
      )
      .join('');

    return {
      W,
      H,
      P,
      n,
      hasZeroLine,
      zeroY,
      dots,
      pathD,
    };
  }, [scores, meds, judges, outlierFlags, selectedJudge, enlarged]);

  const activePoint =
    chartData && hoveredIdx !== null ? chartData.dots[hoveredIdx] ?? null : null;

  return (
    <section
      id="chart-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-[var(--lo)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Median vs. Scores (Signed-Log Scale)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {activePoint && (
            <span className="text-[var(--mut)] tabular-nums">
              #{activePoint.index + 1} · Score:{' '}
              <strong className="text-[var(--ink)] font-mono-data">
                {formatValue(activePoint.scoreVal)}
              </strong>{' '}
              · Med:{' '}
              <strong className="text-[var(--med)] font-mono-data">
                {formatValue(activePoint.medVal)}
              </strong>
              {activePoint.judge !== null && ` · Judge ${activePoint.judge + 1}`}
              {activePoint.isOutlier && (
                <span className="ml-1.5 text-[var(--bad)] font-bold">
                  (OUTLIER)
                </span>
              )}
            </span>
          )}

          <label className="inline-flex items-center gap-1.5 text-[var(--mut)]">
            <span>Filter judge:</span>
            <select
              aria-label="Filter chart by judge"
              value={selectedJudge}
              onChange={(e) => {
                const v = e.target.value;
                onSelectJudge(v === 'all' ? 'all' : Number(v));
              }}
              className="border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-[4px] px-2 py-1 text-xs font-semibold"
            >
              <option value="all">All judges</option>
              {Array.from({ length: judgeCount }, (_, idx) => (
                <option key={idx} value={idx}>
                  Judge {idx + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <svg
          viewBox={`0 0 900 ${enlarged ? 300 : 250}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="Chart of scores and running median"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {!chartData ? (
            <text
              x="450"
              y="128"
              textAnchor="middle"
              fill="currentColor"
              opacity="0.5"
              fontSize="14"
            >
              Chart appears after the first score
            </text>
          ) : (
            <>
              {chartData.hasZeroLine && (
                <>
                  <line
                    x1={chartData.P}
                    x2={chartData.W - chartData.P}
                    y1={chartData.zeroY}
                    y2={chartData.zeroY}
                    stroke="currentColor"
                    opacity="0.22"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={chartData.P - 6}
                    y={chartData.zeroY + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.55"
                  >
                    0
                  </text>
                </>
              )}

              {chartData.dots.map((pt, idxPos) => (
                <circle
                  key={pt.index}
                  cx={pt.x}
                  cy={pt.scoreY}
                  r={
                    hoveredIdx === idxPos
                      ? 5.5
                      : pt.isOutlier
                      ? 4
                      : 3
                  }
                  fill={
                    pt.isOutlier
                      ? '#EF4444'
                      : pt.isUpper
                      ? 'var(--hi)'
                      : 'var(--lo)'
                  }
                  opacity={hoveredIdx === idxPos || pt.isOutlier ? 0.95 : 0.65}
                  className="transition-opacity duration-100 cursor-crosshair"
                  onMouseEnter={() => setHoveredIdx(idxPos)}
                />
              ))}

              <path
                d={chartData.pathD}
                fill="none"
                stroke="var(--med)"
                strokeWidth="2.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
              />

              {activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={chartData.P - 6}
                    y2={chartData.H - chartData.P + 6}
                    stroke="var(--med)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.5"
                    pointerEvents="none"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.medY}
                    r="4.5"
                    fill="var(--med)"
                    stroke="var(--card)"
                    strokeWidth="1.5"
                    pointerEvents="none"
                  />
                </>
              )}

              <text
                x={chartData.P}
                y="16"
                fontSize="11"
                fill="currentColor"
                opacity="0.6"
              >
                Score #1 → #{chartData.n.toLocaleString('en-US')}
              </text>
            </>
          )}
        </svg>

        <p className="text-xs text-[var(--mut)] mt-2 mb-0">
          Vertical axis uses a signed-log scale so extreme scores do not flatten the chart.{' '}
          <span className="text-[var(--lo)] font-semibold">●</span> lower/at-median{' '}
          <span className="text-[var(--hi)] font-semibold ml-2">●</span> upper{' '}
          <span className="text-[#EF4444] font-semibold ml-2">●</span> 1.5×IQR outlier{' '}
          <span className="text-[var(--med)] font-semibold ml-2">━</span> running median
        </p>
      </div>
    </section>
  );
}
