import { useState } from 'react';
import { Play } from 'lucide-react';
import { Scoreboard, generateRandomInt32 } from '../lib/medianEngine';

interface BenchmarkRow {
  n: number;
  th: number;
  ts: number;
  speedup: string;
  avgSwaps: number;
  log2n: number;
  match: boolean;
}

export function BenchmarkSection() {
  const [rows, setRows] = useState<BenchmarkRow[]>([]);
  const [running, setRunning] = useState(false);

  const runBenchmark = async () => {
    const sizes = [500, 1000, 2000, 4000, 8000];
    setRunning(true);
    setRows([]);
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
      const row: BenchmarkRow = {
        n,
        th,
        ts,
        speedup: `${(ts / Math.max(th, 0.01)).toFixed(0)}×`,
        avgSwaps,
        log2n: Math.log2(n),
        match,
      };
      collected.push(row);
      setRows([...collected]);
    }

    setRunning(false);
  };

  const maxTs = rows.length ? Math.max(...rows.map((r) => r.ts), 1) : 1;

  return (
    <section
      id="benchmark-section"
      className="bg-[var(--card)] border border-[var(--line)] rounded-[10px] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-[19px] font-bold tracking-tight text-[var(--ink)] m-0">
          Efficiency: heaps vs. full sorting
        </h2>
        <button
          type="button"
          onClick={runBenchmark}
          disabled={running}
          className="inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[8px] px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-opacity duration-150"
        >
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
          {running ? 'Running benchmark…' : 'Run benchmark'}
        </button>
      </div>

      <p className="text-[14px] text-[var(--mut)] mb-4 mt-0">
        Both methods report the median after every score. The baseline re-sorts all earlier scores each time. Medians are compared at every step, so a mismatch is flagged.
      </p>

      <div className="max-h-[300px] overflow-auto border border-[var(--line)] rounded-[8px]">
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-[var(--mut)]"
                >
                  {running
                    ? 'Measuring heap vs. re-sort execution times…'
                    : 'Click "Run benchmark" to measure 500 to 8,000 scores live in your browser.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
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

      {rows.length > 0 && (
        <svg
          viewBox="0 0 900 140"
          className="w-full h-auto block mt-3"
          role="img"
          aria-label="Benchmark comparison bars"
        >
          {rows.map((r, i) => {
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
    </section>
  );
}
