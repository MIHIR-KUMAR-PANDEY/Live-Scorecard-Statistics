import { ArrowRightLeft, ChevronRight, FastForward } from 'lucide-react';
import { HeapTraceStep, formatValue } from '../lib/medianEngine';
import { HeapsTreeIcon } from './StadiumIcons';

interface HeapTreeVisualizerProps {
  loNodes: (number | null)[];
  hiNodes: (number | null)[];
  loSize: number;
  hiSize: number;
  stepMode: boolean;
  onToggleStepMode: () => void;
  activeStep: HeapTraceStep | null;
  pendingCount: number;
  onNextStep: () => void;
  onFinishInsert: () => void;
}

const NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 200, y: 36 }, // 0 (root)
  { x: 105, y: 106 }, // 1
  { x: 295, y: 106 }, // 2
  { x: 58, y: 178 }, // 3
  { x: 152, y: 178 }, // 4
  { x: 248, y: 178 }, // 5
  { x: 342, y: 178 }, // 6
];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
];

function SingleHeapSvg({
  title,
  nodes,
  totalSize,
  colorVar,
  highlights,
}: {
  title: string;
  nodes: (number | null)[];
  totalSize: number;
  colorVar: string;
  highlights: number[];
}) {
  return (
    <div className="border border-[var(--line)] rounded-[4px] bg-[var(--bg)]/60 p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-bold" style={{ color: colorVar }}>
          {title}
        </span>
        <span className="text-[var(--mut)] tabular-nums font-mono-data">
          {totalSize.toLocaleString('en-US')} total · top 3 levels
        </span>
      </div>

      <svg
        viewBox="0 0 400 215"
        className="w-full h-auto block"
        role="img"
        aria-label={`${title} binary tree showing top 3 levels`}
      >
        {nodes[0] === null ? (
          <text
            x="200"
            y="112"
            textAnchor="middle"
            fill="currentColor"
            opacity="0.45"
            fontSize="13"
          >
            Empty heap
          </text>
        ) : (
          <>
            {EDGES.map(([p, c]) => {
              if (nodes[p] === null || nodes[c] === null) return null;
              const active =
                highlights.includes(p) && highlights.includes(c);
              return (
                <line
                  key={`${p}-${c}`}
                  x1={NODE_POSITIONS[p].x}
                  y1={NODE_POSITIONS[p].y}
                  x2={NODE_POSITIONS[c].x}
                  y2={NODE_POSITIONS[c].y}
                  stroke={active ? 'var(--med)' : colorVar}
                  strokeWidth={active ? '3' : '1.6'}
                  opacity={active ? 1 : 0.45}
                />
              );
            })}

            {NODE_POSITIONS.map((pos, idx) => {
              const val = nodes[idx];
              if (val === null) return null;
              const isRoot = idx === 0;
              const isHighlighted = highlights.includes(idx);
              const label = formatValue(val);
              const compactLabel =
                label.length > 9 ? `${label.slice(0, 7)}…` : label;

              return (
                <g key={idx}>
                  {isRoot && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="25"
                      fill="none"
                      stroke="var(--med)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.75"
                    />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isRoot ? '20' : '18'}
                    fill="var(--card)"
                    stroke={isHighlighted ? 'var(--med)' : colorVar}
                    strokeWidth={isHighlighted ? '3' : isRoot ? '2.5' : '1.75'}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize={compactLabel.length > 6 ? '9.5' : '11.5'}
                    fontWeight={isRoot ? '700' : '600'}
                    fill="currentColor"
                    className="font-mono-data"
                  >
                    {compactLabel}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}

export function HeapTreeVisualizer({
  loNodes,
  hiNodes,
  loSize,
  hiSize,
  stepMode,
  onToggleStepMode,
  activeStep,
  pendingCount,
  onNextStep,
  onFinishInsert,
}: HeapTreeVisualizerProps) {
  const displayLo = activeStep ? activeStep.loNodes : loNodes;
  const displayHi = activeStep ? activeStep.hiNodes : hiNodes;
  const displayLoSize = activeStep ? activeStep.loSize : loSize;
  const displayHiSize = activeStep ? activeStep.hiSize : hiSize;

  return (
    <section
      id="visualizer-section"
      className="scoreboard-panel panel-grid-bg overflow-hidden"
    >
      <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HeapsTreeIcon className="w-4 h-4 text-[var(--lo)]" />
          <h2 className="text-sm font-bold tracking-wide m-0">
            Animated Two-Heap Tree Visualizer
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleStepMode}
            aria-pressed={stepMode}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
              stepMode
                ? 'bg-[var(--med)] text-white border-[var(--med)]'
                : 'bg-transparent text-[var(--ink)] border-[var(--line)] hover:border-[var(--ink)]'
            }`}
          >
            {stepMode ? 'Step mode: ON' : 'Step mode: OFF'}
          </button>

          {activeStep && (
            <>
              <button
                type="button"
                onClick={onNextStep}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                Next step ({pendingCount} left)
              </button>
              <button
                type="button"
                onClick={onFinishInsert}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-transparent text-[var(--ink)] border border-[var(--line)] whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
              >
                <FastForward className="w-3.5 h-3.5" aria-hidden="true" />
                Finish insert
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {/* Live Step Narration Banner */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-[4px] border border-[var(--line)] bg-[var(--bg)] text-sm"
        >
          <span className="font-medium text-[var(--ink)]">
            {activeStep
              ? activeStep.narration
              : stepMode
              ? 'Step mode enabled: add a single score to step through comparisons, sift-ups, and root transfers.'
              : 'Live tree view of both heap roots and top 3 levels. Enable Step mode to narrate each insert.'}
          </span>
          {activeStep?.transferDirection && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--med)] whitespace-nowrap shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
              {activeStep.transferDirection === 'lo-to-hi'
                ? 'Root moved Lower → Upper'
                : 'Root moved Upper → Lower'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SingleHeapSvg
            title="Lower Half · Max-Heap"
            nodes={displayLo}
            totalSize={displayLoSize}
            colorVar="var(--lo)"
            highlights={activeStep ? activeStep.highlightLo : displayLo[0] !== null ? [0] : []}
          />
          <SingleHeapSvg
            title="Upper Half · Min-Heap"
            nodes={displayHi}
            totalSize={displayHiSize}
            colorVar="var(--hi)"
            highlights={activeStep ? activeStep.highlightHi : displayHi[0] !== null ? [0] : []}
          />
        </div>
      </div>
    </section>
  );
}
