import { Play } from 'lucide-react';
import {
  PerfSamplePoint,
  Scoreboard,
  generateRandomInt32,
} from '../lib/medianEngine';
import { StopwatchIcon } from './StadiumIcons';

export interface BenchmarkRow {
  n: number;
  th: number;
  ts: number;
  speedup: string;
  avgSwaps: number;
  log2n: number;
  match: boolean;
}

interface PerformanceLabProps {
  count: number;
  totalSwaps: number;
  lastSwaps: number;
  perfSamples: PerfSamplePoint[];
  benchmarkRows: BenchmarkRow[];
  benchmarkRunning: boolean;
  onRunBenchmark: () => void;
}

export function PerformanceLab({
  count,
  totalSwaps,
  lastSwaps,
  perfSamples,
  benchmarkRows,
  benchmarkRunning,
  onRunBenchmark,
}: PerformanceLabProps) {
  const avgSwaps = count > 0 ? totalSwaps / count : 0;
  const log2n = count > 0 ? Math.log2(count) : 0;
  const maxGauge = Math.max(log2n * 1.5, lastSwaps, avgSwaps, 4);
  const logPct = Math.min(100, (log2n / maxGauge) * 100);
  const avgPct = Math.min(100, (avgSwaps / maxGauge) * 100);
  const lastPct = Math.min(100, (lastSwaps / maxGauge) * 100);

  const maxTs = benchmarkRows.length
    ? Math.max(...benchmarkRows.map((r) => r.ts), 1)
    : 1;

  // Scaling curve SVG geometry
  const curveSvg = (() => {
    if (perfSamples.length < 2) return null;
    const W = 900;
    const H = 165;
    const P = 36;
    const maxN = Math.max(...perfSamples.map((p) => p.n), 1);
    const maxY = Math.max(
      ...perfSamples.map((p) => Math.max(p.heapMsPerInsert, p.sortMsPerInsert)),
      0.01
    );
    const X = (n: number) => P + (n / maxN) * (W - 2 * P);
    const Y = (v: number) => H - P - (v / maxY) * (H - 2 * P);

    const heapPath = perfSamples
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${X(p.n).toFixed(1)} ${Y(
            p.heapMsPerInsert
          ).toFixed(1)}`
      )
      .join('');
    const sortPath = perfSamples
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${X(p.n).toFixed(1)} ${Y(
            p.sortMsPerInsert
          ).toFixed(1)}`
      )
      .join('');

    return { W, H, P, maxN, maxY, heapPath, sortPath, X, Y };
  })();

  return (
    <section
      id="benchmark-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StopwatchIcon className="w-4 h-4 text-[var(--lo)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Performance Lab: Heaps vs. Full Sorting
          </h2>
        </div>

        <button
          type="button"
          onClick={onRunBenchmark}
          disabled={benchmarkRunning}
          className="inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[4px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
          {benchmarkRunning ? 'Running benchmark…' : 'Run benchmark'}
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Complexity Cheat-Sheet + Operations per Insert Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Operations per Insert Gauge */}
          <div className="lg:col-span-6 p-3.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--ink)]">
                Live Operations / Insert Gauge
              </span>
              <span className="text-[var(--mut)] font-mono-data tabular-nums">
                log₂({count.toLocaleString('en-US') || 1}) = {log2n.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1.5 text-xs tabular-nums">
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[var(--mut)]">Last insert swaps</span>
                  <strong className="font-mono-data text-[var(--med)]">
                    {lastSwaps}
                  </strong>
                </div>
                <div className="h-2 rounded-[2px] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--med)] transition-[width] duration-150"
                    style={{ width: `${lastPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[var(--mut)]">Average swaps / insert</span>
                  <strong className="font-mono-data text-[var(--lo)]">
                    {avgSwaps.toFixed(2)}
                  </strong>
                </div>
                <div className="h-2 rounded-[2px] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--lo)] transition-[width] duration-150"
                    style={{ width: `${avgPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[var(--mut)]">Theoretical bound log₂(n)</span>
                  <strong className="font-mono-data text-[var(--hi)]">
                    {log2n.toFixed(2)}
                  </strong>
                </div>
                <div className="h-2 rounded-[2px] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--hi)] transition-[width] duration-150"
                    style={{ width: `${logPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Complexity Cheat-Sheet Card */}
          <div className="lg:col-span-6 p-3.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/60 grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] text-[var(--mut)]">
                Two-heap insert
              </span>
              <code className="text-base font-bold text-[var(--lo)]">
                O(log n)
              </code>
            </div>
            <div>
              <span className="block text-[11px] text-[var(--mut)]">
                Median read
              </span>
              <code className="text-base font-bold text-[var(--med)]">
                O(1)
              </code>
            </div>
            <div>
              <span className="block text-[11px] text-[var(--mut)]">
                Stream memory
              </span>
              <code className="text-base font-bold text-[var(--ink)]">
                O(n)
              </code>
            </div>
            <div>
              <span className="block text-[11px] text-[var(--mut)]">
                Full re-sort baseline
              </span>
              <code className="text-base font-bold text-[var(--hi)]">
                O(n log n) / update
              </code>
            </div>
          </div>
        </div>

        {/* Time-per-insert scaling curve (sampled every 1,000 inserts) */}
        <div className="p-3.5 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/50">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
            <span className="font-bold text-[var(--ink)]">
              Measured Time per Insert as Stream Grows (sampled every 1,000 inserts)
            </span>
            <span className="text-[var(--mut)]">
              <span className="text-[var(--lo)] font-semibold">━</span> Two heaps (flat){' '}
              <span className="text-[var(--hi)] font-semibold ml-2">━</span> Full re-sort (rising)
            </span>
          </div>
          <svg
            viewBox="0 0 900 165"
            className="w-full h-auto block"
            role="img"
            aria-label="Time per insert scaling curve comparing heaps vs full re-sort"
          >
            {!curveSvg ? (
              <text
                x="450"
                y="86"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.5"
                fontSize="12"
              >
                Load ≥ 2,000 scores (e.g. Random 100,000 or 100,000 stress test) to plot the live scaling curve
              </text>
            ) : (
              <>
                <line
                  x1={curveSvg.P}
                  x2={curveSvg.W - curveSvg.P}
                  y1={curveSvg.H - curveSvg.P}
                  y2={curveSvg.H - curveSvg.P}
                  stroke="currentColor"
                  opacity="0.2"
                />
                <path
                  d={curveSvg.sortPath}
                  fill="none"
                  stroke="var(--hi)"
                  strokeWidth="2.4"
                />
                <path
                  d={curveSvg.heapPath}
                  fill="none"
                  stroke="var(--lo)"
                  strokeWidth="2.6"
                />
                <text
                  x={curveSvg.P}
                  y="14"
                  fontSize="10.5"
                  fill="currentColor"
                  opacity="0.65"
                >
                  Peak single-insert baseline: {curveSvg.maxY.toFixed(3)} ms · Stream up to {curveSvg.maxN.toLocaleString('en-US')} scores
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Exact 500 - 8,000 Benchmark Table & Bar Chart */}
        <div>
          <p className="text-xs text-[var(--mut)] mb-2 mt-0">
            Both methods report the median after every score. The baseline re-sorts all earlier scores each time. Medians are compared at every step, so a mismatch is flagged.
          </p>

          <div className="max-h-[280px] overflow-auto border border-[var(--line)] rounded-[4px]">
            <table className="w-full border-collapse tabular-nums text-sm">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-left">
                    Scores
                  </th>
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                    Heaps (ms)
                  </th>
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                    Re-sort (ms)
                  </th>
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                    Speed-up
                  </th>
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                    Avg swaps / insert
                  </th>
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                    log₂ n
                  </th>
                  <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                    Medians match
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchmarkRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-5 text-center text-[var(--mut)]"
                    >
                      {benchmarkRunning
                        ? 'Measuring heap vs. re-sort execution times…'
                        : 'Click "Run benchmark" to measure 500 to 8,000 scores live in your browser.'}
                    </td>
                  </tr>
                ) : (
                  benchmarkRows.map((r) => (
                    <tr
                      key={r.n}
                      className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg)]/60 transition-colors"
                    >
                      <td className="px-3 py-2 text-left font-mono-data">
                        {r.n.toLocaleString('en-US')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-data text-[var(--lo)] font-semibold">
                        {r.th.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-data text-[var(--hi)] font-semibold">
                        {r.ts.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-data font-bold">
                        {r.speedup}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-data">
                        {r.avgSwaps.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-data text-[var(--mut)]">
                        {r.log2n.toFixed(1)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${
                          r.match ? 'text-[var(--ok)]' : 'text-[var(--bad)]'
                        }`}
                      >
                        {r.match ? 'Yes' : 'NO'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {benchmarkRows.length > 0 && (
            <svg
              viewBox="0 0 900 140"
              className="w-full h-auto block mt-3"
              role="img"
              aria-label="Benchmark comparison bars"
            >
              {benchmarkRows.map((r, i) => {
                const y = i * 27 + 6;
                const w = (v: number) => Math.max(3, (v / maxTs) * 630);
                const wTs = w(r.ts);
                const wTh = w(r.th);
                return (
                  <g key={r.n}>
                    <text
                      x="0"
                      y={y + 12}
                      fontSize="11"
                      fill="currentColor"
                      className="font-mono-data"
                    >
                      {r.n.toLocaleString('en-US')}
                    </text>
                    <rect
                      x="64"
                      y={y}
                      width={wTs}
                      height="9"
                      rx="2"
                      fill="var(--hi)"
                    />
                    <rect
                      x="64"
                      y={y + 11}
                      width={wTh}
                      height="9"
                      rx="2"
                      fill="var(--lo)"
                    />
                    <text
                      x={70 + wTs}
                      y={y + 8}
                      fontSize="10"
                      fill="currentColor"
                      opacity="0.85"
                    >
                      re-sort {r.ts.toFixed(0)} ms
                    </text>
                    <text
                      x={70 + wTh}
                      y={y + 19}
                      fontSize="10"
                      fill="currentColor"
                      opacity="0.85"
                    >
                      heaps {r.th.toFixed(1)} ms
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}

export async function executeBenchmarkSuite(
  onProgress: (rows: BenchmarkRow[]) => void
): Promise<BenchmarkRow[]> {
  const sizes = [500, 1000, 2000, 4000, 8000];
  const collected: BenchmarkRow[] = [];

  for (const n of sizes) {
    await new Promise((r) => setTimeout(r, 20));
    const data = generateRandomInt32(n);

    let t0 = performance.now();
    const b = new Scoreboard();
    for (let i = 0; i < data.length; i++) {
      b.add(data[i]);
    }
    const th = performance.now() - t0;
    const avgSwaps = (b.lo.swaps + b.hi.swaps) / n;

    t0 = performance.now();
    const ref: number[] = [];
    for (let i = 1; i <= n; i++) {
      const s = data.slice(0, i).sort();
      ref.push(i % 2 ? s[(i - 1) / 2] : (s[i / 2 - 1] + s[i / 2]) / 2);
    }
    const ts = performance.now() - t0;

    const match = ref.every((v, idx) => v === b.meds[idx]);
    collected.push({
      n,
      th,
      ts,
      speedup: `${(ts / Math.max(th, 0.01)).toFixed(0)}×`,
      avgSwaps,
      log2n: Math.log2(n),
      match,
    });
    onProgress([...collected]);
  }
  return collected;
}
