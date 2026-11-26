export function HowItWorksStrip() {
  return (
    <section
      aria-label="How the two-heap median works"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2 text-xs font-bold tracking-wide text-[var(--mut)]">
        How it works · 3-Step Streaming Pipeline
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="flex items-start gap-3 p-3 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/50">
          <svg
            viewBox="0 0 48 48"
            className="w-11 h-11 shrink-0"
            aria-hidden="true"
          >
            <circle cx="24" cy="10" r="5" fill="var(--med)" />
            <path
              d="M24 17v10m0 0-8 7m8-7 8 7"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="14" cy="38" r="5" fill="var(--lo)" />
            <circle cx="34" cy="38" r="5" fill="var(--hi)" />
          </svg>
          <div>
            <h3 className="text-sm font-bold m-0 mb-0.5 text-[var(--ink)]">
              1. Push to the correct heap
            </h3>
            <p className="text-xs text-[var(--mut)] m-0">
              Scores ≤ lower root enter the{' '}
              <span className="text-[var(--lo)] font-semibold">cyan max-heap</span>; larger scores enter the{' '}
              <span className="text-[var(--hi)] font-semibold">gold min-heap</span>.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3 p-3 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/50">
          <svg
            viewBox="0 0 48 48"
            className="w-11 h-11 shrink-0"
            aria-hidden="true"
          >
            <rect x="6" y="28" width="14" height="12" rx="2" fill="var(--lo)" opacity="0.85" />
            <rect x="28" y="28" width="14" height="12" rx="2" fill="var(--hi)" opacity="0.85" />
            <path
              d="M17 18h14m0 0-4-4m4 4-4 4M31 18H17m0 0 4-4m-4 4 4 4"
              stroke="var(--med)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h3 className="text-sm font-bold m-0 mb-0.5 text-[var(--ink)]">
              2. Rebalance the roots
            </h3>
            <p className="text-xs text-[var(--mut)] m-0">
              If sizes differ by more than one, pop one root and push it across so both halves stay balanced in{' '}
              <code>O(log n)</code>.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3 p-3 rounded-[4px] border border-[var(--line)] bg-[var(--bg)]/50">
          <svg
            viewBox="0 0 48 48"
            className="w-11 h-11 shrink-0"
            aria-hidden="true"
          >
            <circle cx="15" cy="18" r="7" fill="none" stroke="var(--lo)" strokeWidth="2.5" />
            <circle cx="33" cy="18" r="7" fill="none" stroke="var(--hi)" strokeWidth="2.5" />
            <path
              d="M15 26v6l9 5 9-5v-6"
              fill="none"
              stroke="var(--med)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="39" r="3.5" fill="var(--med)" />
          </svg>
          <div>
            <h3 className="text-sm font-bold m-0 mb-0.5 text-[var(--ink)]">
              3. Read the middle roots
            </h3>
            <p className="text-xs text-[var(--mut)] m-0">
              Odd count reads the lower root; even count averages both roots. Always{' '}
              <code>O(1)</code> with zero re-sorting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
