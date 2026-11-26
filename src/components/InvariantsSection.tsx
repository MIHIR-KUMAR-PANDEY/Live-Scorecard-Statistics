import { HeapsTreeIcon } from './StadiumIcons';

export function InvariantsSection() {
  return (
    <section
      id="theory-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex items-center gap-2">
        <HeapsTreeIcon className="w-4 h-4 text-[var(--med)]" />
        <h2 className="text-sm font-bold tracking-wide m-0">
          Why the two middle values are always recoverable
        </h2>
      </div>

      <div className="p-4 sm:p-5">
        <ol className="pl-5 space-y-2 text-[15px] text-[var(--ink)] m-0">
          <li>
            The <strong className="text-[var(--lo)]">lower heap</strong> is a max-heap holding the smaller half. Its root is the largest of the small scores.
          </li>
          <li>
            The <strong className="text-[var(--hi)]">upper heap</strong> is a min-heap holding the larger half. Its root is the smallest of the large scores.
          </li>
          <li>
            <strong>Invariant A:</strong> every score in the lower heap is ≤ every score in the upper heap. So the lower root and the upper root are neighbours in sorted order.
          </li>
          <li>
            <strong>Invariant B:</strong> the lower heap has the same number of scores as the upper heap, or exactly one more.
          </li>
          <li>
            For an odd count the lower root is the exact middle. For an even count the lower root and upper root are the two middle scores, and the median is their mean.
          </li>
          <li>
            Each insert pushes the score to the correct side, then moves at most one root across to restore B. That is a constant number of heap operations, each{' '}
            <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--line)]">
              O(log n)
            </code>
            . Reading the median is{' '}
            <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--line)]">
              O(1)
            </code>
            .
          </li>
          <li>
            Duplicates and negatives need no special handling because only comparisons are used. A single score sits alone in the lower heap.
          </li>
        </ol>
        <p className="mt-4 mb-0 text-[15px]">
          <strong>Complexity:</strong> insert{' '}
          <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--line)]">
            O(log n)
          </code>
          , median{' '}
          <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--line)]">
            O(1)
          </code>
          , memory{' '}
          <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--line)]">
            O(n)
          </code>
          . Re-sorting each time costs{' '}
          <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--line)]">
            O(n log n)
          </code>{' '}
          per update.
        </p>
      </div>
    </section>
  );
}
