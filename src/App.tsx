import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  FileJson,
  HelpCircle,
  Maximize2,
  Minimize2,
  Moon,
  Play,
  RotateCcw,
  Square,
  Sun,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  BenchmarkRow,
  PerformanceLab,
  executeBenchmarkSuite,
} from './components/PerformanceLab';
import { HeapTreeVisualizer } from './components/HeapTreeVisualizer';
import { HowItWorksStrip } from './components/HowItWorksStrip';
import { InvariantsSection } from './components/InvariantsSection';
import { LedMedianPanel } from './components/LedMedianPanel';
import { JUDGE_COLORS, LiveEventsPanel } from './components/LiveEventsPanel';
import { MedianChart } from './components/MedianChart';
import { MedianVsMeanPanel } from './components/MedianVsMeanPanel';
import { OutlierStatsStrip } from './components/OutlierStatsStrip';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  ClipboardIcon,
  LaurelWreathSvg,
  TrophyIcon,
} from './components/StadiumIcons';
import { TestResult, TestsSection } from './components/TestsSection';
import {
  HeapTraceStep,
  MAX_INT32,
  MIN_INT32,
  STREAM_LIMIT,
  ScenarioPresetId,
  Scoreboard,
  buildInsertTrace,
  formatValue,
  generateJudgeScore,
  generateRandomInt32,
  parseScores,
} from './lib/medianEngine';
import { playMedianChime, playTick } from './lib/sound';

const HERO_BANNER_SRC = '/src/assets/images/stadium_night_hero_1795673790347.jpg';

interface StatusMessage {
  text: string;
  isError: boolean;
}

const top3 = (arr: number[]): (number | null)[] => {
  const out: (number | null)[] = [];
  for (let i = 0; i < 7; i++) out.push(i < arr.length ? arr[i] : null);
  return out;
};

export default function App() {
  // Default dark arena stadium theme; no localStorage
  const [dark, setDark] = useState<boolean>(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Live broadcast clock
  const [clockText, setClockText] = useState<string>(() =>
    new Date().toLocaleTimeString('en-US', { hour12: false })
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setClockText(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Core Scoreboard reference (in-memory only)
  const sbRef = useRef<Scoreboard>(new Scoreboard());
  const [, setTick] = useState<number>(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // UI & feature states
  const [eventName, setEventName] = useState<string>('Inter-College Finals');
  const [judgeCount, setJudgeCount] = useState<number>(5);
  const [speedPerSec, setSpeedPerSec] = useState<number>(8);
  const [isLiveRunning, setIsLiveRunning] = useState<boolean>(false);
  const [selectedJudgeFilter, setSelectedJudgeFilter] = useState<number | 'all'>('all');

  const [singleInput, setSingleInput] = useState<string>('');
  const [bulkInput, setBulkInput] = useState<string>('');
  const [status, setStatus] = useState<StatusMessage>({ text: '', isError: false });
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [stressProgress, setStressProgress] = useState<number | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);

  // Step mode state for Animated Heap Visualizer
  const [stepMode, setStepMode] = useState<boolean>(false);
  const [traceQueue, setTraceQueue] = useState<HeapTraceStep[]>([]);
  const [pendingValue, setPendingValue] = useState<number | null>(null);

  // Sound (off by default)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Presentation mode + auto-cycling showcase
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [presentationSlide, setPresentationSlide] = useState<number>(0);

  // Shortcuts modal
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);

  // Benchmark & Tests state (shared so JSON export includes them)
  const [benchmarkRows, setBenchmarkRows] = useState<BenchmarkRow[]>([]);
  const [benchmarkRunning, setBenchmarkRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testRunTrigger, setTestRunTrigger] = useState<number>(0);

  // Refs for timers & inputs
  const singleInputRef = useRef<HTMLInputElement | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const judgeCursorRef = useRef<number>(0);
  const livePresetRef = useRef<ScenarioPresetId>('normal');

  const stopAllTimers = useCallback(() => {
    if (replayTimerRef.current !== null) {
      window.clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (liveTimerRef.current !== null) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    setIsReplaying(false);
    setIsLiveRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current !== null) window.clearInterval(replayTimerRef.current);
      if (liveTimerRef.current !== null) window.clearInterval(liveTimerRef.current);
    };
  }, []);

  // Auto-cycle slides every 10 seconds in Presentation Mode
  useEffect(() => {
    if (!presentationMode) return;
    const id = window.setInterval(() => {
      setPresentationSlide((s) => (s + 1) % 4);
    }, 10000);
    return () => window.clearInterval(id);
  }, [presentationMode]);

  const sb = sbRef.current;

  const insertWithSound = useCallback(
    (arr: number[], judgeIdx: number | null = null): string => {
      const sbCurr = sbRef.current;
      const prevMed = sbCurr.median();
      const room = STREAM_LIMIT - sbCurr.count;
      let note = '';
      let slice = arr;
      if (slice.length > room) {
        slice = slice.slice(0, room);
        note = ' Stopped at the 100,000-score limit.';
      }
      for (let i = 0; i < slice.length; i++) {
        sbCurr.add(slice[i], judgeIdx);
      }
      const nextMed = sbCurr.median();
      if (soundEnabled && slice.length > 0) {
        if (nextMed !== prevMed) {
          playMedianChime();
        } else {
          playTick();
        }
      }
      bump();
      return note;
    },
    [bump, soundEnabled]
  );

  const ingest = useCallback(
    (
      arr: number[],
      bad: number,
      label: string,
      overrideText?: string,
      judgeIdx: number | null = null
    ) => {
      if (!arr.length) {
        setStatus({
          text: bad
            ? `No valid scores. ${bad} entr${
                bad > 1 ? 'ies are' : 'y is'
              } not a whole number between −2,147,483,648 and 2,147,483,647.`
            : 'Enter at least one score.',
          isError: true,
        });
        return;
      }
      const note = insertWithSound(arr, judgeIdx);
      setStatus({
        text:
          overrideText ??
          `${label}: added ${arr.length.toLocaleString('en-US')} score${
            arr.length > 1 ? 's' : ''
          }.${
            bad ? ` Skipped ${bad} invalid entr${bad > 1 ? 'ies' : 'y'}.` : ''
          }${note}`,
        isError: bad > 0,
      });
    },
    [insertWithSound]
  );

  const handleReset = useCallback(() => {
    stopAllTimers();
    sbRef.current = new Scoreboard();
    setTraceQueue([]);
    setPendingValue(null);
    setSelectedJudgeFilter('all');
    setStatus({ text: '', isError: false });
    bump();
  }, [bump, stopAllTimers]);

  // Step mode handlers
  const commitPendingStepInsert = useCallback(() => {
    if (pendingValue !== null) {
      if (sbRef.current.count < STREAM_LIMIT) {
        insertWithSound([pendingValue], null);
        setStatus({
          text: `Stepped insert completed: added ${pendingValue.toLocaleString(
            'en-US'
          )}.`,
          isError: false,
        });
      }
      setPendingValue(null);
      setTraceQueue([]);
    }
  }, [insertWithSound, pendingValue]);

  const handleNextStep = useCallback(() => {
    if (traceQueue.length <= 1) {
      commitPendingStepInsert();
      return;
    }
    setTraceQueue((q) => q.slice(1));
  }, [commitPendingStepInsert, traceQueue.length]);

  const handleAddOne = useCallback(() => {
    const r = parseScores(singleInput.trim());
    if (!r.ok.length) {
      ingest([], r.bad || 1, 'Single score');
      setSingleInput('');
      singleInputRef.current?.focus();
      return;
    }
    const val = r.ok[0];
    if (sbRef.current.count >= STREAM_LIMIT) {
      setStatus({
        text: 'Stopped at the 100,000-score limit.',
        isError: true,
      });
      return;
    }

    if (stepMode) {
      // Finish any prior pending insert first
      if (pendingValue !== null) {
        insertWithSound([pendingValue], null);
      }
      const steps = buildInsertTrace(sbRef.current.lo.a, sbRef.current.hi.a, val);
      setPendingValue(val);
      setTraceQueue(steps);
      setStatus({
        text: `Stepping through insert of ${val.toLocaleString('en-US')}. Click "Next step" to advance.`,
        isError: false,
      });
    } else {
      ingest([val], 0, 'Single score');
    }
    setSingleInput('');
    singleInputRef.current?.focus();
  }, [ingest, insertWithSound, pendingValue, singleInput, stepMode]);

  const handleAddBulk = () => {
    if (pendingValue !== null) commitPendingStepInsert();
    const r = parseScores(bulkInput);
    ingest(r.ok, r.bad, 'Bulk input');
    if (r.ok.length) setBulkInput('');
  };

  const handleReplaySlowly = () => {
    if (isReplaying) {
      stopAllTimers();
      setStatus({ text: 'Replay stopped.', isError: false });
      return;
    }
    const r = parseScores(bulkInput);
    if (!r.ok.length) {
      setStatus({
        text: 'Paste scores first, then replay.',
        isError: true,
      });
      return;
    }
    stopAllTimers();
    const q = r.ok.slice();
    setIsReplaying(true);
    setStatus({
      text: `Replaying ${q.length.toLocaleString('en-US')} scores…`,
      isError: false,
    });
    replayTimerRef.current = window.setInterval(() => {
      if (!q.length || sbRef.current.count >= STREAM_LIMIT) {
        stopAllTimers();
        setStatus({ text: 'Replay finished.', isError: false });
        return;
      }
      const next = q.shift();
      if (next !== undefined) insertWithSound([next]);
    }, 300);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const r = parseScores(text);
      ingest(r.ok, r.bad, `File "${file.name}"`);
    } catch {
      setStatus({
        text: `Could not read file "${file.name}".`,
        isError: true,
      });
    }
  };

  const handleLoadExample = () => {
    handleReset();
    ingest([5, 1, 9, 3], 0, 'Example [5, 1, 9, 3] → medians 5, 3, 5, 4');
  };

  const handleUnseenMix = () => {
    const pool = [
      MIN_INT32,
      MAX_INT32,
      0,
      -1,
      1,
      7,
      7,
      7,
      -50,
      -50,
      100,
      2147483646,
      -2147483647,
    ];
    const arr: number[] = [];
    for (let i = 0; i < 60; i++) {
      arr.push(
        Math.random() < 0.5
          ? pool[Math.floor(Math.random() * pool.length)]
          : Math.floor(Math.random() * 2001) - 1000
      );
    }
    ingest(arr, 0, 'Unseen mix (negatives, repeats, extremes)');
  };

  // Chunked 100,000 runner with real timing curve + progress shimmer
  const run100kWithProgress = useCallback(
    (label: string) => {
      stopAllTimers();
      sbRef.current = new Scoreboard();
      setTraceQueue([]);
      setPendingValue(null);
      setStressProgress(0);
      bump();

      const data = generateRandomInt32(STREAM_LIMIT);
      const CHUNK = 5000;
      let offset = 0;
      let totalHeapMs = 0;

      const stepChunk = () => {
        const curr = sbRef.current;
        const end = Math.min(STREAM_LIMIT, offset + CHUNK);
        const t0 = performance.now();
        for (let i = offset; i < end; i++) {
          curr.add(data[i], i % judgeCount);
        }
        const dt = performance.now() - t0;
        totalHeapMs += dt;
        const heapPerInsert = dt / (end - offset);

        // Measure a single genuine baseline sort at every 10,000th score
        let sortPerInsert = heapPerInsert;
        if (end % 10000 === 0 || end === 5000) {
          const ts0 = performance.now();
          Int32Array.from(curr.scores).sort();
          sortPerInsert = performance.now() - ts0;
        } else if (curr.perfSamples.length > 0) {
          sortPerInsert =
            curr.perfSamples[curr.perfSamples.length - 1].sortMsPerInsert * 1.04;
        }

        curr.perfSamples.push({
          n: end,
          heapMsPerInsert: heapPerInsert,
          sortMsPerInsert: sortPerInsert,
        });

        offset = end;
        setStressProgress((offset / STREAM_LIMIT) * 100);
        bump();

        if (offset < STREAM_LIMIT) {
          window.setTimeout(stepChunk, 12);
        } else {
          setStressProgress(null);
          setStatus({
            text: `${label}: added 100,000 scores. Heaps took ${totalHeapMs.toFixed(
              0
            )} ms in total.`,
            isError: false,
          });
        }
      };

      window.setTimeout(stepChunk, 20);
    },
    [bump, judgeCount, stopAllTimers]
  );

  // Inject dramatic outlier for Median vs Mean panel
  const handleInjectOutlier = () => {
    const med = sbRef.current.median();
    const spike =
      med !== null && med >= 0
        ? Math.min(MAX_INT32, Math.round(med + 50000000))
        : 50000000;
    ingest([spike], 0, 'Extreme outlier injected');
  };

  // Live Event Simulation (3-9 judges, 1-50/sec)
  const toggleLiveEvent = useCallback(() => {
    if (isLiveRunning) {
      stopAllTimers();
      setStatus({ text: 'Live event paused.', isError: false });
      return;
    }
    stopAllTimers();
    setIsLiveRunning(true);
    setStatus({
      text: `Live event "${eventName || 'Competition'}" running with ${judgeCount} judges…`,
      isError: false,
    });
  }, [eventName, isLiveRunning, judgeCount, stopAllTimers]);

  useEffect(() => {
    if (!isLiveRunning) return;
    const intervalMs = Math.max(20, Math.round(1000 / speedPerSec));
    liveTimerRef.current = window.setInterval(() => {
      if (sbRef.current.count >= STREAM_LIMIT) {
        stopAllTimers();
        setStatus({ text: 'Reached 100,000-score limit.', isError: false });
        return;
      }
      const j = judgeCursorRef.current % judgeCount;
      judgeCursorRef.current++;
      const score = generateJudgeScore(j, livePresetRef.current);
      insertWithSound([score], j);
    }, intervalMs);

    return () => {
      if (liveTimerRef.current !== null) {
        window.clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    };
  }, [insertWithSound, isLiveRunning, judgeCount, speedPerSec, stopAllTimers]);

  // Scenario Presets
  const handleRunPreset = (preset: ScenarioPresetId) => {
    if (preset === 'stress100k') {
      run100kWithProgress('100,000 stress test');
      return;
    }

    handleReset();
    livePresetRef.current = preset;

    if (preset === 'single') {
      ingest([42], 0, 'Preset: Single score', undefined, 0);
      return;
    }

    const batch: number[] = [];
    for (let i = 0; i < 60; i++) {
      const j = i % judgeCount;
      batch.push(generateJudgeScore(j, preset));
    }
    const curr = sbRef.current;
    for (let i = 0; i < batch.length; i++) {
      curr.add(batch[i], i % judgeCount);
    }
    bump();

    const labels: Record<ScenarioPresetId, string> = {
      normal: 'Normal contest (60 scores)',
      biased: 'Biased judge (Judge 1 inflated, 60 scores)',
      outliers: 'Extreme outliers (60 scores)',
      ties: 'Many ties (60 scores)',
      negatives: 'All negatives (60 scores)',
      single: 'Single score',
      stress100k: '100,000 stress test',
    };
    setStatus({
      text: `Preset loaded: ${labels[preset]}.`,
      isError: false,
    });
  };

  // Benchmark runner
  const handleRunBenchmark = useCallback(async () => {
    setBenchmarkRunning(true);
    setBenchmarkRows([]);
    await executeBenchmarkSuite((partial) => setBenchmarkRows(partial));
    setBenchmarkRunning(false);
  }, []);

  // Exports & Summary Copy
  const handleExportCsv = () => {
    if (!sb.scores.length) {
      setStatus({ text: 'Nothing to export yet.', isError: true });
      return;
    }
    const lines = ['index,score,median,mean,judge,outlier'];
    for (let i = 0; i < sb.scores.length; i++) {
      const j = sb.judges[i];
      lines.push(
        `${i + 1},${sb.scores[i]},${sb.meds[i]},${sb.means[i].toFixed(2)},${
          j !== null ? `Judge ${j + 1}` : ''
        },${sb.outlierFlags[i] ? 'yes' : 'no'}`
      );
    }
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'median-x-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const qStats = sb.getQuartileStats();
    const report = {
      app: 'Median X – Live Score Statistics',
      exportedAt: new Date().toISOString(),
      config: {
        eventName,
        judgeCount,
        streamLimit: STREAM_LIMIT,
      },
      stats: {
        count: sb.count,
        median: sb.median(),
        mean: sb.mean(),
        min: sb.min,
        max: sb.max,
        lowerHeapRoot: sb.lo.size ? sb.lo.peek() : null,
        lowerHeapSize: sb.lo.size,
        upperHeapRoot: sb.hi.size ? sb.hi.peek() : null,
        upperHeapSize: sb.hi.size,
        totalSwaps: sb.lo.swaps + sb.hi.swaps,
        quartiles: qStats,
        outlierCount: sb.outlierFlags.filter(Boolean).length,
      },
      benchmarkResults: benchmarkRows,
      testSummary: {
        passed: testResults.filter((t) => t.passed).length,
        total: testResults.length,
        results: testResults,
      },
      history: sb.scores.map((score, i) => ({
        index: i + 1,
        score,
        median: sb.meds[i],
        mean: sb.means[i],
        judge: sb.judges[i] !== null ? `Judge ${sb.judges[i]! + 1}` : null,
        outlier: sb.outlierFlags[i],
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'median-x-report.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ text: 'Exported full JSON report.', isError: false });
  };

  const handleCopySummary = async () => {
    const qStats = sb.getQuartileStats();
    const summary = [
      `Median X — ${eventName || 'Competition'}`,
      `Scores: ${sb.count.toLocaleString('en-US')}`,
      `Median: ${formatValue(sb.median())} | Mean: ${formatValue(sb.mean())}`,
      `Range: ${formatValue(sb.min)} to ${formatValue(sb.max)}`,
      `Q1: ${formatValue(qStats.q1)} | Q3: ${formatValue(qStats.q3)} | IQR: ${formatValue(qStats.iqr)}`,
      `Lower Root: ${formatValue(sb.lo.size ? sb.lo.peek() : null)} (${sb.lo.size}) | Upper Root: ${formatValue(sb.hi.size ? sb.hi.peek() : null)} (${sb.hi.size})`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setStatus({ text: 'Summary copied to clipboard.', isError: false });
    } catch {
      setStatus({ text: 'Clipboard unavailable in this browser.', isError: true });
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable;

      if (e.key === 'Escape') {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (presentationMode) {
          setPresentationMode(false);
          return;
        }
      }

      if (isEditing) return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        singleInputRef.current?.focus();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const val = Math.floor(Math.random() * 201) - 50;
        ingest([val], 0, 'Random score');
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleLiveEvent();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPresentationMode((v) => !v);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTestRunTrigger((v) => v + 1);
        document
          .getElementById('tests-section')
          ?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ingest, presentationMode, shortcutsOpen, toggleLiveEvent]);

  const med = sb.median();
  const meanVal = sb.mean();
  const qStats = sb.getQuartileStats();
  const outlierCount = sb.outlierFlags.filter(Boolean).length;

  // History rows (newest 50)
  const historyRows: {
    index: number;
    score: number;
    median: number;
    judge: number | null;
    outlier: boolean;
  }[] = [];
  for (
    let i = sb.scores.length - 1;
    i >= Math.max(0, sb.scores.length - 50);
    i--
  ) {
    historyRows.push({
      index: i + 1,
      score: sb.scores[i],
      median: sb.meds[i],
      judge: sb.judges[i],
      outlier: sb.outlierFlags[i],
    });
  }

  // Last 15 updates for the sports news crawl ticker
  const tickerItems: { index: number; score: number; median: number }[] = [];
  for (
    let i = Math.max(0, sb.scores.length - 15);
    i < sb.scores.length;
    i++
  ) {
    tickerItems.push({
      index: i + 1,
      score: sb.scores[i],
      median: sb.meds[i],
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] stadium-floodlights pb-16 transition-colors duration-150">
      {/* Night Stadium Hero Banner + Broadcast Score-Bug Header */}
      <div className="relative overflow-hidden border-b border-[var(--line)]">
        {/* Background Stadium Image with SVG fallback and dark gradient scrim */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {!heroImgFailed ? (
            <img
              src={HERO_BANNER_SRC}
              alt="Night competition stadium arena illuminated by cyan and amber floodlights"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover opacity-35 dark:opacity-45"
            />
          ) : (
            <svg
              viewBox="0 0 1200 260"
              preserveAspectRatio="none"
              className="w-full h-full opacity-50"
            >
              <defs>
                <linearGradient id="beamL" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3CC3CF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3CC3CF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="beamR" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0A93A" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F0A93A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,0 520,260 120,260" fill="url(#beamL)" />
              <polygon points="1200,0 1080,260 680,260" fill="url(#beamR)" />
            </svg>
          )}
          <div
            className="absolute inset-0"
            style={{
              background: dark
                ? 'linear-gradient(180deg, rgba(11,15,26,0.68) 0%, rgba(11,15,26,0.92) 100%)'
                : 'linear-gradient(180deg, rgba(238,240,244,0.82) 0%, rgba(238,240,244,0.96) 100%)',
            }}
          />
        </div>

        {/* Broadcast Score-Bug Top Bar */}
        <header className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-5">
          <div className="scoreboard-panel bg-[var(--card)]/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {/* Brand Zone */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="p-1.5 rounded-[4px] bg-[var(--med)]/15 text-[var(--med)] border border-[var(--med)]/30">
                <TrophyIcon className="w-4 h-4" />
              </span>
              <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">
                MEDIAN<span className="text-[var(--med)]">X</span>
              </span>
            </div>

            {/* Center Broadcast Score Bug: Laurel LIVE + Event Name + Clock */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] border border-[var(--line)] bg-[var(--bg)] font-mono-data font-bold">
                <LaurelWreathSvg className="w-10 h-5 text-[var(--hi)] hidden sm:block" />
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveRunning || sb.count > 0
                      ? 'bg-[#EF4444] animate-pulse'
                      : 'bg-[var(--mut)]'
                  }`}
                  aria-hidden="true"
                />
                <span className="tracking-wider">LIVE</span>
              </div>

              <span className="font-semibold text-[var(--ink)] truncate max-w-[200px] sm:max-w-xs">
                {eventName || 'Inter-College Finals'}
              </span>

              <span className="font-mono-data tabular-nums text-[var(--mut)]">
                {clockText}
              </span>
            </div>

            {/* Primary Action: Presentation Mode */}
            <button
              type="button"
              onClick={() => setPresentationMode((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-[4px] bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {presentationMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Exit presentation (P)
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Presentation mode
                </>
              )}
            </button>
          </div>

          {/* Hero Title + Compact Utility Bar */}
          {!presentationMode && (
            <div className="mt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-tight leading-tight m-0 text-balance">
                  Live Score Statistics Arena
                </h1>
                <p className="text-[var(--mut)] m-0 mt-1 text-sm sm:text-[15px]">
                  Two-heap streaming median for inter-college competitions · O(log n) insert · O(1) median read.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((s) => !s)}
                  aria-pressed={soundEnabled}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[var(--line)] bg-[var(--card)]/90 text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[var(--ok)]" aria-hidden="true" />
                      Sound: ON
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-[var(--mut)]" aria-hidden="true" />
                      Sound: OFF
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDark((d) => !d)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[var(--line)] bg-[var(--card)]/90 text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                >
                  {dark ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[var(--hi)]" aria-hidden="true" />
                      Light theme
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                      Dark arena
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[var(--line)] bg-[var(--card)]/90 text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  Copy summary
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[var(--line)] bg-[var(--card)]/90 text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                >
                  <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                  Export JSON
                </button>

                <button
                  type="button"
                  onClick={() => setShortcutsOpen(true)}
                  aria-label="Open keyboard shortcuts"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[var(--line)] bg-[var(--card)]/90 text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                >
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  ?
                </button>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {presentationMode ? (
          /* ================= PRESENTATION MODE ================= */
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 scoreboard-panel px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  'Scores & Median',
                  'Median vs. Mean',
                  'Two-Heap Tree & Distribution',
                  'Performance Lab',
                ].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPresentationSlide(idx)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] border whitespace-nowrap shrink-0 cursor-pointer ${
                      presentationSlide === idx
                        ? 'bg-[var(--med)] text-white border-[var(--med)]'
                        : 'bg-transparent text-[var(--mut)] border-[var(--line)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[var(--mut)] font-mono-data">
                Auto-cycling every 10s · Press P or Esc to exit
              </span>
            </div>

            <LedMedianPanel
              median={med}
              mean={meanVal}
              count={sb.count}
              min={sb.min}
              max={sb.max}
              lastSwaps={sb.lastSwaps}
              loRoot={sb.lo.size ? sb.lo.peek() : null}
              loSize={sb.lo.size}
              hiRoot={sb.hi.size ? sb.hi.peek() : null}
              hiSize={sb.hi.size}
              enlarged
            />

            {presentationSlide === 0 && (
              <MedianChart
                scores={sb.scores}
                meds={sb.meds}
                judges={sb.judges}
                outlierFlags={sb.outlierFlags}
                judgeCount={judgeCount}
                selectedJudge={selectedJudgeFilter}
                onSelectJudge={setSelectedJudgeFilter}
                enlarged
              />
            )}
            {presentationSlide === 1 && (
              <MedianVsMeanPanel
                meds={sb.meds}
                means={sb.means}
                currentMedian={med}
                currentMean={meanVal}
                onInjectOutlier={handleInjectOutlier}
              />
            )}
            {presentationSlide === 2 && (
              <div className="space-y-5">
                <HeapTreeVisualizer
                  loNodes={top3(sb.lo.a)}
                  hiNodes={top3(sb.hi.a)}
                  loSize={sb.lo.size}
                  hiSize={sb.hi.size}
                  stepMode={stepMode}
                  onToggleStepMode={() => setStepMode((s) => !s)}
                  activeStep={traceQueue[0] ?? null}
                  pendingCount={Math.max(0, traceQueue.length - 1)}
                  onNextStep={handleNextStep}
                  onFinishInsert={commitPendingStepInsert}
                />
                <OutlierStatsStrip
                  stats={qStats}
                  outlierCount={outlierCount}
                  reservoir={sb.reservoir}
                />
              </div>
            )}
            {presentationSlide === 3 && (
              <PerformanceLab
                count={sb.count}
                totalSwaps={sb.lo.swaps + sb.hi.swaps}
                lastSwaps={sb.lastSwaps}
                perfSamples={sb.perfSamples}
                benchmarkRows={benchmarkRows}
                benchmarkRunning={benchmarkRunning}
                onRunBenchmark={handleRunBenchmark}
              />
            )}
          </div>
        ) : (
          /* ================= FULL ARENA WORKSPACE ================= */
          <>
            {/* How It Works 3-Step Strip */}
            <HowItWorksStrip />

            {/* Top 2-Column Live LED Scoreboard + Input Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 flex flex-col">
                <LedMedianPanel
                  median={med}
                  mean={meanVal}
                  count={sb.count}
                  min={sb.min}
                  max={sb.max}
                  lastSwaps={sb.lastSwaps}
                  loRoot={sb.lo.size ? sb.lo.peek() : null}
                  loSize={sb.lo.size}
                  hiRoot={sb.hi.size ? sb.hi.peek() : null}
                  hiSize={sb.hi.size}
                />
              </div>

              {/* Input Deck */}
              <section className="lg:col-span-5 scoreboard-panel panel-grid-bg flex flex-col justify-between overflow-hidden">
                <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardIcon className="w-4 h-4 text-[var(--lo)]" />
                    <h2 className="text-sm font-bold tracking-wide m-0">
                      Add Scores & Replay
                    </h2>
                  </div>
                  <span className="text-xs text-[var(--mut)] font-mono-data">
                    32-bit int · max 100k
                  </span>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <label
                      htmlFor="one"
                      className="block text-xs font-semibold text-[var(--mut)] mb-1"
                    >
                      One score (Shortcut: A)
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={singleInputRef}
                        id="one"
                        type="number"
                        step={1}
                        value={singleInput}
                        onChange={(e) => setSingleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOne();
                          }
                        }}
                        placeholder="e.g. -42"
                        className="flex-1 min-w-0 border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-[4px] px-3 py-2 text-sm font-mono-data"
                      />
                      <button
                        type="button"
                        onClick={handleAddOne}
                        className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[4px] px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Add score
                      </button>
                    </div>

                    <label
                      htmlFor="bulk"
                      className="block text-xs font-semibold text-[var(--mut)] mt-3.5 mb-1"
                    >
                      Many scores (spaces, commas or new lines)
                    </label>
                    <textarea
                      id="bulk"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder="5 1 9 3"
                      className="w-full min-h-[72px] resize-y border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-[4px] px-3 py-2 text-sm font-mono-data"
                    />

                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={handleAddBulk}
                        className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[4px] px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Add all
                      </button>
                      <button
                        type="button"
                        onClick={handleReplaySlowly}
                        className="inline-flex items-center gap-1.5 border border-[var(--ink)] bg-transparent text-[var(--ink)] rounded-[4px] px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--bg)]"
                      >
                        {isReplaying ? (
                          <>
                            <Square className="w-3.5 h-3.5" aria-hidden="true" />
                            Stop replay
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" aria-hidden="true" />
                            Replay slowly
                          </>
                        )}
                      </button>
                      <label className="inline-flex items-center gap-1.5 border border-[var(--ink)] bg-transparent text-[var(--ink)] rounded-[4px] px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--bg)]">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        Replay file
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-[var(--line)]">
                      <button
                        type="button"
                        onClick={handleUnseenMix}
                        className="border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] rounded-[4px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                      >
                        Unseen mix (60)
                      </button>
                      <button
                        type="button"
                        disabled={stressProgress !== null}
                        onClick={() => run100kWithProgress('100,000 random scores')}
                        className="border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] rounded-[4px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)] disabled:opacity-50"
                      >
                        Random 100,000
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadExample}
                        className="border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] rounded-[4px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                      >
                        Load example
                      </button>
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-1 border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] rounded-[4px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1 border border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] rounded-[4px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--ink)]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        Reset
                      </button>
                    </div>
                  </div>

                  <div
                    role="status"
                    aria-live="polite"
                    className={`min-h-[22px] mt-3 text-xs ${
                      status.isError
                        ? 'text-[var(--bad)] font-semibold'
                        : 'text-[var(--mut)]'
                    }`}
                  >
                    {status.text}
                  </div>
                </div>
              </section>
            </div>

            {/* Judges & Live Event Simulator + Scenario Presets */}
            <LiveEventsPanel
              eventName={eventName}
              onEventNameChange={setEventName}
              judgeCount={judgeCount}
              onJudgeCountChange={setJudgeCount}
              speedPerSec={speedPerSec}
              onSpeedChange={setSpeedPerSec}
              isLiveRunning={isLiveRunning}
              onToggleLive={toggleLiveEvent}
              onRunPreset={handleRunPreset}
              stressProgress={stressProgress}
            />

            {/* Animated Two-Heap Binary Tree Visualizer */}
            <HeapTreeVisualizer
              loNodes={top3(sb.lo.a)}
              hiNodes={top3(sb.hi.a)}
              loSize={sb.lo.size}
              hiSize={sb.hi.size}
              stepMode={stepMode}
              onToggleStepMode={() => {
                if (stepMode && pendingValue !== null) {
                  commitPendingStepInsert();
                }
                setStepMode((s) => !s);
              }}
              activeStep={traceQueue[0] ?? null}
              pendingCount={Math.max(0, traceQueue.length - 1)}
              onNextStep={handleNextStep}
              onFinishInsert={commitPendingStepInsert}
            />

            {/* Median vs Mean Panel (Why Averages Mislead) */}
            <MedianVsMeanPanel
              meds={sb.meds}
              means={sb.means}
              currentMedian={med}
              currentMean={meanVal}
              onInjectOutlier={handleInjectOutlier}
            />

            {/* Outlier & Statistics Strip + 20-Bin Histogram */}
            <OutlierStatsStrip
              stats={qStats}
              outlierCount={outlierCount}
              reservoir={sb.reservoir}
            />

            {/* Median vs Scores Signed-Log Chart with Judge Filter & Outlier Dots */}
            <MedianChart
              scores={sb.scores}
              meds={sb.meds}
              judges={sb.judges}
              outlierFlags={sb.outlierFlags}
              judgeCount={judgeCount}
              selectedJudge={selectedJudgeFilter}
              onSelectJudge={setSelectedJudgeFilter}
            />

            {/* Median History Table (Newest 50 with Judge Chips & Outlier Flags) */}
            <section
              id="history-section"
              className="scoreboard-panel panel-grid-bg overflow-hidden"
            >
              <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardIcon className="w-4 h-4 text-[var(--med)]" />
                  <h2 className="text-sm font-bold tracking-wide m-0">
                    Median History
                  </h2>
                </div>
                <span className="text-xs text-[var(--mut)] tabular-nums font-mono-data">
                  {sb.scores.length > 0
                    ? `Newest ${historyRows.length} of ${sb.scores.length.toLocaleString(
                        'en-US'
                      )}`
                    : '0 entries'}
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <div className="max-h-[300px] overflow-auto border border-[var(--line)] rounded-[4px]">
                  <table className="w-full border-collapse tabular-nums text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-left">
                          #
                        </th>
                        <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-left">
                          Judge
                        </th>
                        <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                          Score added
                        </th>
                        <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                          Median after
                        </th>
                        <th className="sticky top-0 bg-[var(--card)] text-[var(--mut)] text-xs font-semibold px-3 py-2 text-right">
                          Flag
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-6 text-center text-[var(--mut)]"
                          >
                            No scores yet. Add one, load the example, or start Live event.
                          </td>
                        </tr>
                      ) : (
                        historyRows.map((row) => (
                          <tr
                            key={row.index}
                            className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg)]/60 transition-colors"
                          >
                            <td className="px-3 py-1.5 text-left text-[var(--mut)] font-mono-data">
                              {row.index}
                            </td>
                            <td className="px-3 py-1.5 text-left text-xs">
                              {row.judge !== null ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-[2px] inline-block"
                                    style={{
                                      backgroundColor:
                                        JUDGE_COLORS[
                                          row.judge % JUDGE_COLORS.length
                                        ],
                                    }}
                                    aria-hidden="true"
                                  />
                                  <span>Judge {row.judge + 1}</span>
                                </span>
                              ) : (
                                <span className="text-[var(--mut)]">Manual</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono-data">
                              {formatValue(row.score)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-[var(--med)] font-mono-data">
                              {formatValue(row.median)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs">
                              {row.outlier ? (
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-[var(--bad)]/15 text-[var(--bad)] font-bold">
                                  OUTLIER
                                </span>
                              ) : (
                                <span className="text-[var(--mut)]">–</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[var(--mut)] mt-2 mb-0">
                  Newest 50 shown. Export CSV or JSON for the full history.
                </p>
              </div>
            </section>

            {/* Performance Lab */}
            <PerformanceLab
              count={sb.count}
              totalSwaps={sb.lo.swaps + sb.hi.swaps}
              lastSwaps={sb.lastSwaps}
              perfSamples={sb.perfSamples}
              benchmarkRows={benchmarkRows}
              benchmarkRunning={benchmarkRunning}
              onRunBenchmark={handleRunBenchmark}
            />

            {/* Verification Tests (17 total) */}
            <TestsSection
              results={testResults}
              onResultsChange={setTestResults}
              runTrigger={testRunTrigger}
            />

            {/* Two-Heap Invariants Explanation */}
            <InvariantsSection />
          </>
        )}

        {/* Footer */}
        <footer className="pt-4 pb-6 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--mut)]">
          <span>Team Median X · Problem Statement 07</span>
          <span>Built with two heaps · No sorting library · Zero external APIs</span>
        </footer>
      </main>

      {/* Bottom Sports News Crawl Ticker (Last 15 Scores & Medians) */}
      <aside
        aria-label="Recent scores ticker"
        className="fixed bottom-0 inset-x-0 z-30 h-9 border-t border-[var(--line)] bg-[var(--card)]/95 backdrop-blur-sm flex items-center overflow-hidden ticker-wrapper"
      >
        <div className="px-3 h-full flex items-center bg-[var(--med)] text-white text-[11px] font-bold tracking-wider whitespace-nowrap shrink-0">
          SCORE WIRE
        </div>
        <div className="flex-1 overflow-hidden">
          {tickerItems.length === 0 ? (
            <div className="px-4 text-xs text-[var(--mut)] font-mono-data whitespace-nowrap">
              Awaiting competition scores — add a score or start Live event to stream updates.
            </div>
          ) : (
            <div className="ticker-track font-mono-data text-xs tabular-nums">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex items-center gap-6 px-4">
                  {tickerItems.map((item) => (
                    <span
                      key={`${dup}-${item.index}`}
                      className="whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      <span className="text-[var(--mut)]">#{item.index}</span>
                      <strong className="text-[var(--ink)]">
                        {formatValue(item.score)}
                      </strong>
                      <span className="text-[var(--mut)]">→</span>
                      <strong className="text-[var(--med)]">
                        Med {formatValue(item.median)}
                      </strong>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
