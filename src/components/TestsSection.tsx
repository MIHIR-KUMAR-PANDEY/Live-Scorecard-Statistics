import { useCallback, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TESTS } from '../lib/medianEngine';
import { ClipboardIcon } from './StadiumIcons';

export interface TestResult {
  name: string;
  passed: boolean;
}

interface TestsSectionProps {
  results: TestResult[];
  onResultsChange: (results: TestResult[]) => void;
  runTrigger: number;
}

export function TestsSection({
  results,
  onResultsChange,
  runTrigger,
}: TestsSectionProps) {
  const runAllTests = useCallback(() => {
    const next = TESTS.map((t) => {
      let passed = false;
      try {
        passed = Boolean(t.run());
      } catch {
        passed = false;
      }
      return { name: t.name, passed };
    });
    onResultsChange(next);
  }, [onResultsChange]);

  useEffect(() => {
    runAllTests();
  }, [runAllTests, runTrigger]);

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <section
      id="tests-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ClipboardIcon className="w-4 h-4 text-[var(--ok)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Verification Test Suite
          </h2>
          {results.length > 0 && (
            <span className="text-xs text-[var(--mut)] tabular-nums font-mono-data">
              {passedCount} / {results.length} passed
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={runAllTests}
          className="inline-flex items-center gap-1.5 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[4px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-opacity"
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Run all tests (T)
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="max-h-[340px] overflow-auto border border-[var(--line)] rounded-[4px]">
          <table className="w-full border-collapse tabular-nums text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-left">
                  Test
                </th>
                <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.name}
                  className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg)]/60 transition-colors"
                >
                  <td className="px-3 py-2 text-left">{r.name}</td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      r.passed ? 'text-[var(--ok)]' : 'text-[var(--bad)]'
                    }`}
                  >
                    {r.passed ? 'Pass' : 'Fail'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
