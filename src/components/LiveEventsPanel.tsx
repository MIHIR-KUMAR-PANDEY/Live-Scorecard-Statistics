import { Pause, Play } from 'lucide-react';
import { ScenarioPresetId } from '../lib/medianEngine';
import { ClipboardIcon } from './StadiumIcons';

export const JUDGE_COLORS = [
  '#3CC3CF',
  '#F0A93A',
  '#FF5A9A',
  '#4CCF86',
  '#A78BFA',
  '#38BDF8',
  '#FB7185',
  '#34D399',
  '#FBBF24',
];

interface LiveEventsPanelProps {
  eventName: string;
  onEventNameChange: (name: string) => void;
  judgeCount: number;
  onJudgeCountChange: (count: number) => void;
  speedPerSec: number;
  onSpeedChange: (speed: number) => void;
  isLiveRunning: boolean;
  onToggleLive: () => void;
  onRunPreset: (preset: ScenarioPresetId) => void;
  stressProgress: number | null;
}

const PRESETS: { id: ScenarioPresetId; label: string }[] = [
  { id: 'normal', label: 'Normal contest' },
  { id: 'biased', label: 'Biased judge' },
  { id: 'outliers', label: 'Extreme outliers' },
  { id: 'ties', label: 'Many ties' },
  { id: 'negatives', label: 'All negatives' },
  { id: 'single', label: 'Single score' },
  { id: 'stress100k', label: '100,000 stress test' },
];

export function LiveEventsPanel({
  eventName,
  onEventNameChange,
  judgeCount,
  onJudgeCountChange,
  speedPerSec,
  onSpeedChange,
  isLiveRunning,
  onToggleLive,
  onRunPreset,
  stressProgress,
}: LiveEventsPanelProps) {
  return (
    <section
      id="events-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardIcon className="w-4 h-4 text-[var(--hi)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Judges & Live Event Simulator
          </h2>
        </div>

        <span className="text-xs text-[var(--mut)] font-mono-data">
          {judgeCount} judges · {speedPerSec}/sec
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label
              htmlFor="event-name-input"
              className="block text-xs font-semibold text-[var(--mut)] mb-1"
            >
              Event name
            </label>
            <input
              id="event-name-input"
              type="text"
              value={eventName}
              onChange={(e) => onEventNameChange(e.target.value)}
              maxLength={40}
              placeholder="Inter-College Finals"
              className="w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-[4px] px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="judge-count-select"
              className="block text-xs font-semibold text-[var(--mut)] mb-1"
            >
              Judges (3–9)
            </label>
            <select
              id="judge-count-select"
              value={judgeCount}
              onChange={(e) => onJudgeCountChange(Number(e.target.value))}
              className="w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-[4px] px-3 py-2 text-sm font-semibold"
            >
              {[3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n} Judges
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="speed-slider"
              className="block text-xs font-semibold text-[var(--mut)] mb-1 tabular-nums"
            >
              Speed: {speedPerSec} scores/sec
            </label>
            <input
              id="speed-slider"
              type="range"
              min={1}
              max={50}
              value={speedPerSec}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-full accent-[var(--med)] cursor-pointer"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={onToggleLive}
              className={`w-full inline-flex items-center justify-center gap-1.5 rounded-[4px] px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                isLiveRunning
                  ? 'bg-[var(--med)] text-white border-[var(--med)]'
                  : 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
              }`}
            >
              {isLiveRunning ? (
                <>
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  Pause (Space)
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" aria-hidden="true" />
                  Live event
                </>
              )}
            </button>
          </div>
        </div>

        {/* Judge color key */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--mut)]">
          <span>Active judges:</span>
          {Array.from({ length: judgeCount }, (_, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-[2px] inline-block"
                style={{ backgroundColor: JUDGE_COLORS[idx % JUDGE_COLORS.length] }}
                aria-hidden="true"
              />
              <span>Judge {idx + 1}</span>
            </span>
          ))}
        </div>

        {/* Scenario Presets */}
        <div className="pt-2 border-t border-[var(--line)]">
          <div className="text-xs font-semibold text-[var(--mut)] mb-2">
            Scenario presets
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={stressProgress !== null}
                onClick={() => onRunPreset(p.id)}
                className="border border-[var(--line)] bg-[var(--bg)]/60 text-[var(--ink)] rounded-[4px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)] disabled:opacity-50 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skeleton shimmer + progress bar during 100,000-score run */}
        {stressProgress !== null && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-[4px] border border-[var(--line)] bg-[var(--bg)] space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-mono-data">
              <span className="font-semibold text-[var(--ink)]">
                Streaming 100,000 32-bit scores into two heaps…
              </span>
              <span className="text-[var(--med)] font-bold">
                {Math.round(stressProgress)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-[2px] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
              <div
                className="h-full bg-[var(--med)] transition-[width] duration-75"
                style={{ width: `${stressProgress}%` }}
              />
            </div>
            <div className="h-3 w-full rounded-[2px] shimmer-bar" aria-hidden="true" />
          </div>
        )}
      </div>
    </section>
  );
}
