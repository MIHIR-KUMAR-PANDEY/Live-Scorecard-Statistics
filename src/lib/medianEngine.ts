export const MIN_INT32 = -2147483648;
export const MAX_INT32 = 2147483647;
export const STREAM_LIMIT = 100000;
const RESERVOIR_CAP = 1000;

// ============================================================================
// === CORE TWO-HEAP ALGORITHM (PRESERVED EXACTLY AS SPECIFIED) ===============
// ============================================================================

export class Heap {
  a: number[];
  cmp: (x: number, y: number) => number;
  swaps: number;

  constructor(cmp: (x: number, y: number) => number) {
    this.a = [];
    this.cmp = cmp;
    this.swaps = 0;
  }

  get size(): number {
    return this.a.length;
  }

  peek(): number {
    return this.a[0];
  }

  push(v: number): void {
    const a = this.a;
    const c = this.cmp;
    let i = a.length;
    a.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (c(a[i], a[p]) < 0) {
        [a[i], a[p]] = [a[p], a[i]];
        this.swaps++;
        i = p;
      } else {
        break;
      }
    }
  }

  pop(): number | undefined {
    const a = this.a;
    const c = this.cmp;
    const top = a[0];
    const last = a.pop();
    if (a.length && last !== undefined) {
      a[0] = last;
      let i = 0;
      const n = a.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && c(a[l], a[m]) < 0) m = l;
        if (r < n && c(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        this.swaps++;
        i = m;
      }
    }
    return top;
  }
}

export interface QuartileStats {
  q1: number | null;
  median: number | null;
  q3: number | null;
  iqr: number | null;
  lowerFence: number | null;
  upperFence: number | null;
  isSampled: boolean;
  sampleSize: number;
}

export interface PerfSamplePoint {
  n: number;
  heapMsPerInsert: number;
  sortMsPerInsert: number;
}

export class Scoreboard {
  lo: Heap;
  hi: Heap;
  scores: number[];
  meds: number[];
  means: number[];
  judges: (number | null)[];
  outlierFlags: boolean[];
  reservoir: number[];
  perfSamples: PerfSamplePoint[];
  min: number | null;
  max: number | null;
  sum: number;
  lastSwaps: number;

  constructor() {
    // Lower half: max-heap; Upper half: min-heap
    this.lo = new Heap((x, y) => y - x);
    this.hi = new Heap((x, y) => x - y);
    this.scores = [];
    this.meds = [];
    this.means = [];
    this.judges = [];
    this.outlierFlags = [];
    this.reservoir = [];
    this.perfSamples = [];
    this.min = null;
    this.max = null;
    this.sum = 0;
    this.lastSwaps = 0;
  }

  get count(): number {
    return this.lo.size + this.hi.size;
  }

  add(x: number, judgeIdx: number | null = null): number {
    const s0 = this.lo.swaps + this.hi.swaps;
    if (this.lo.size === 0 || x <= this.lo.peek()) {
      this.lo.push(x);
    } else {
      this.hi.push(x);
    }
    if (this.lo.size > this.hi.size + 1) {
      const moved = this.lo.pop();
      if (moved !== undefined) this.hi.push(moved);
    } else if (this.hi.size > this.lo.size) {
      const moved = this.hi.pop();
      if (moved !== undefined) this.lo.push(moved);
    }
    this.min = this.min === null ? x : Math.min(this.min, x);
    this.max = this.max === null ? x : Math.max(this.max, x);
    const m = this.median()!;
    this.scores.push(x);
    this.meds.push(m);
    this.lastSwaps = this.lo.swaps + this.hi.swaps - s0;

    // O(1) running mean tracking
    this.sum += x;
    this.means.push(this.sum / this.count);
    this.judges.push(judgeIdx);

    // O(1) Reservoir Sampling (Algorithm R) for non-full-sort quartile & IQR estimation
    const total = this.count;
    if (this.reservoir.length < RESERVOIR_CAP) {
      this.reservoir.push(x);
    } else {
      const replaceIdx = Math.floor(Math.random() * total);
      if (replaceIdx < RESERVOIR_CAP) {
        this.reservoir[replaceIdx] = x;
      }
    }

    // Outlier check using 1.5 x IQR rule
    this.outlierFlags.push(this.checkOutlierAgainstCurrent(x));

    return m;
  }

  median(): number | null {
    if (!this.count) return null;
    return this.lo.size > this.hi.size
      ? this.lo.peek()
      : (this.lo.peek() + this.hi.peek()) / 2;
  }

  mean(): number | null {
    if (!this.count) return null;
    return this.sum / this.count;
  }

  // Computes Q1, Q3, IQR from the bounded reservoir sample (<= 1,000 items) without sorting the full stream
  getQuartileStats(): QuartileStats {
    const med = this.median();
    if (this.reservoir.length < 4) {
      return {
        q1: null,
        median: med,
        q3: null,
        iqr: null,
        lowerFence: null,
        upperFence: null,
        isSampled: false,
        sampleSize: this.reservoir.length,
      };
    }

    const sortedSample = Int32Array.from(this.reservoir).sort();
    const len = sortedSample.length;
    const mid = Math.floor(len / 2);
    const lowerHalf = sortedSample.subarray(0, mid);
    const upperHalf = sortedSample.subarray(len % 2 === 0 ? mid : mid + 1);

    const medianOf = (arr: Int32Array): number => {
      const m = arr.length;
      return m % 2 === 1
        ? arr[(m - 1) >> 1]
        : (arr[m / 2 - 1] + arr[m / 2]) / 2;
    };

    const q1 = medianOf(lowerHalf);
    const q3 = medianOf(upperHalf);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    return {
      q1,
      median: med,
      q3,
      iqr,
      lowerFence,
      upperFence,
      isSampled: this.count > RESERVOIR_CAP,
      sampleSize: len,
    };
  }

  private checkOutlierAgainstCurrent(x: number): boolean {
    if (this.count < 4) return false;
    const stats = this.getQuartileStats();
    if (stats.lowerFence === null || stats.upperFence === null) return false;
    return x < stats.lowerFence || x > stats.upperFence;
  }
}

// ============================================================================
// === STEP-BY-STEP HEAP TRACE GENERATOR (FOR ANIMATED TREE VISUALIZER) =======
// ============================================================================

export interface HeapTraceStep {
  loNodes: (number | null)[];
  hiNodes: (number | null)[];
  loSize: number;
  hiSize: number;
  activeHeap: 'lo' | 'hi' | 'both' | 'none';
  highlightLo: number[];
  highlightHi: number[];
  transferDirection: 'lo-to-hi' | 'hi-to-lo' | null;
  narration: string;
}

const top3Levels = (arr: number[]): (number | null)[] => {
  const out: (number | null)[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(i < arr.length ? arr[i] : null);
  }
  return out;
};

export function buildInsertTrace(
  loInitial: number[],
  hiInitial: number[],
  x: number
): HeapTraceStep[] {
  const steps: HeapTraceStep[] = [];
  const lo = loInitial.slice();
  const hi = hiInitial.slice();

  const loCmp = (a: number, b: number) => b - a;
  const hiCmp = (a: number, b: number) => a - b;

  const pushAndTrace = (
    heapName: 'lo' | 'hi',
    arr: number[],
    cmp: (a: number, b: number) => number,
    val: number,
    initialMsg: string
  ) => {
    let idx = arr.length;
    arr.push(val);
    steps.push({
      loNodes: top3Levels(lo),
      hiNodes: top3Levels(hi),
      loSize: lo.length,
      hiSize: hi.length,
      activeHeap: heapName,
      highlightLo: heapName === 'lo' && idx < 7 ? [idx] : [],
      highlightHi: heapName === 'hi' && idx < 7 ? [idx] : [],
      transferDirection: null,
      narration: initialMsg,
    });

    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (cmp(arr[idx], arr[parent]) < 0) {
        [arr[idx], arr[parent]] = [arr[parent], arr[idx]];
        steps.push({
          loNodes: top3Levels(lo),
          hiNodes: top3Levels(hi),
          loSize: lo.length,
          hiSize: hi.length,
          activeHeap: heapName,
          highlightLo:
            heapName === 'lo'
              ? [idx, parent].filter((k) => k < 7)
              : [],
          highlightHi:
            heapName === 'hi'
              ? [idx, parent].filter((k) => k < 7)
              : [],
          transferDirection: null,
          narration: `Sift up in ${
            heapName === 'lo' ? 'lower' : 'upper'
          } heap: swapped ${arr[parent]} with ${arr[idx]}.`,
        });
        idx = parent;
      } else {
        break;
      }
    }
  };

  const popAndTrace = (
    heapName: 'lo' | 'hi',
    arr: number[],
    cmp: (a: number, b: number) => number
  ): number => {
    const top = arr[0];
    const last = arr.pop()!;
    if (arr.length > 0) {
      arr[0] = last;
      let i = 0;
      const n = arr.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && cmp(arr[l], arr[m]) < 0) m = l;
        if (r < n && cmp(arr[r], arr[m]) < 0) m = r;
        if (m === i) break;
        [arr[i], arr[m]] = [arr[m], arr[i]];
        i = m;
      }
    }
    return top;
  };

  if (lo.length === 0 || x <= lo[0]) {
    const reason =
      lo.length === 0
        ? `Lower heap is empty, so ${x} goes to the lower heap.`
        : `${x} ≤ lower root ${lo[0]}, so it goes to the lower heap.`;
    pushAndTrace('lo', lo, loCmp, x, reason);
  } else {
    pushAndTrace(
      'hi',
      hi,
      hiCmp,
      x,
      `${x} > lower root ${lo[0]}, so it goes to the upper heap.`
    );
  }

  if (lo.length > hi.length + 1) {
    const rootVal = lo[0];
    const moved = popAndTrace('lo', lo, loCmp);
    hi.push(moved);
    let idx = hi.length - 1;
    while (idx > 0) {
      const p = (idx - 1) >> 1;
      if (hiCmp(hi[idx], hi[p]) < 0) {
        [hi[idx], hi[p]] = [hi[p], hi[idx]];
        idx = p;
      } else break;
    }
    steps.push({
      loNodes: top3Levels(lo),
      hiNodes: top3Levels(hi),
      loSize: lo.length,
      hiSize: hi.length,
      activeHeap: 'both',
      highlightLo: [0],
      highlightHi: idx < 7 ? [0, idx] : [0],
      transferDirection: 'lo-to-hi',
      narration: `Heaps are now unbalanced (lower ${lo.length + 1} vs upper ${
        hi.length - 1
      }), moving root ${rootVal} to the upper heap.`,
    });
  } else if (hi.length > lo.length) {
    const rootVal = hi[0];
    const moved = popAndTrace('hi', hi, hiCmp);
    lo.push(moved);
    let idx = lo.length - 1;
    while (idx > 0) {
      const p = (idx - 1) >> 1;
      if (loCmp(lo[idx], lo[p]) < 0) {
        [lo[idx], lo[p]] = [lo[p], lo[idx]];
        idx = p;
      } else break;
    }
    steps.push({
      loNodes: top3Levels(lo),
      hiNodes: top3Levels(hi),
      loSize: lo.length,
      hiSize: hi.length,
      activeHeap: 'both',
      highlightLo: idx < 7 ? [0, idx] : [0],
      highlightHi: [0],
      transferDirection: 'hi-to-lo',
      narration: `Heaps are now unbalanced (upper ${hi.length + 1} > lower ${
        lo.length - 1
      }), moving root ${rootVal} to the lower heap.`,
    });
  }

  const newMedian =
    lo.length > hi.length ? lo[0] : (lo[0] + hi[0]) / 2;

  steps.push({
    loNodes: top3Levels(lo),
    hiNodes: top3Levels(hi),
    loSize: lo.length,
    hiSize: hi.length,
    activeHeap: 'none',
    highlightLo: lo.length ? [0] : [],
    highlightHi: hi.length ? [0] : [],
    transferDirection: null,
    narration: `Balanced! Lower (${lo.length}) & upper (${hi.length}) invariants hold. New median: ${formatValue(
      newMedian
    )}.`,
  });

  return steps;
}

// ============================================================================
// === UTILITIES, PARSER, GENERATOR & TESTS ===================================
// ============================================================================

export function bruteMedian(arr: ArrayLike<number>): number {
  const s = Int32Array.from(arr).sort();
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function parseScores(text: string): { ok: number[]; bad: number } {
  const toks = text.split(/[\s,;]+/).filter(Boolean);
  const ok: number[] = [];
  let bad = 0;
  for (const t of toks) {
    const v = Number(t);
    if (Number.isInteger(v) && v >= MIN_INT32 && v <= MAX_INT32) {
      ok.push(v);
    } else {
      bad++;
    }
  }
  return { ok, bad };
}

export function generateRandomInt32(n: number): Int32Array {
  const a = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    a[i] = Math.floor(Math.random() * 4294967296) + MIN_INT32;
  }
  return a;
}

export type ScenarioPresetId =
  | 'normal'
  | 'biased'
  | 'outliers'
  | 'ties'
  | 'negatives'
  | 'single'
  | 'stress100k';

export function generateJudgeScore(
  judgeIndex: number,
  preset: ScenarioPresetId = 'normal'
): number {
  let raw = 0;
  switch (preset) {
    case 'biased': {
      // Judge 0 scores consistently high; others cluster near 50
      raw =
        judgeIndex === 0
          ? 92 + Math.floor(Math.random() * 15)
          : 42 + Math.floor(Math.random() * 20);
      break;
    }
    case 'outliers': {
      raw =
        Math.random() < 0.14
          ? (Math.random() < 0.5 ? 1 : -1) *
            (500000 + Math.floor(Math.random() * 50000000))
          : 40 + Math.floor(Math.random() * 35);
      break;
    }
    case 'ties': {
      const tiePool = [10, 25, 50, 50, 50, 75, 100];
      raw = tiePool[Math.floor(Math.random() * tiePool.length)];
      break;
    }
    case 'negatives': {
      raw = -100 - Math.floor(Math.random() * 400);
      break;
    }
    case 'single': {
      raw = 42;
      break;
    }
    default: {
      // Normal contest: bell-like cluster around 50..85 with judge offset
      const u = (Math.random() + Math.random() + Math.random()) / 3;
      raw = Math.round(25 + u * 75 + (judgeIndex % 3) * 3);
      break;
    }
  }
  return Math.max(MIN_INT32, Math.min(MAX_INT32, Math.trunc(raw)));
}

export function formatValue(v: number | null): string {
  if (v === null) return '–';
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  return v.toLocaleString('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

export interface TestCase {
  name: string;
  run: () => boolean;
}

export const TESTS: TestCase[] = [
  {
    name: 'Example [5,1,9,3] gives 5,3,5,4',
    run: () => {
      const s = new Scoreboard();
      return JSON.stringify([5, 1, 9, 3].map((x) => s.add(x))) === '[5,3,5,4]';
    },
  },
  {
    name: 'Single score is its own median',
    run: () => {
      const s = new Scoreboard();
      return s.add(-7) === -7 && s.count === 1;
    },
  },
  {
    name: 'Empty board has no median',
    run: () => new Scoreboard().median() === null,
  },
  {
    name: 'All repeated scores',
    run: () => {
      const s = new Scoreboard();
      return [4, 4, 4, 4, 4].every((x) => s.add(x) === 4);
    },
  },
  {
    name: 'Negative scores',
    run: () => {
      const s = new Scoreboard();
      return (
        JSON.stringify([-5, -1, -9, -3].map((x) => s.add(x))) ===
        '[-5,-3,-5,-4]'
      );
    },
  },
  {
    name: '32-bit extremes (even count mean)',
    run: () => {
      const s = new Scoreboard();
      s.add(MIN_INT32);
      return s.add(MAX_INT32) === -0.5;
    },
  },
  {
    name: 'Mixed signs and half values',
    run: () => {
      const s = new Scoreboard();
      s.add(-1);
      return s.add(2) === 0.5;
    },
  },
  {
    name: 'Ascending stream',
    run: () => {
      const s = new Scoreboard();
      const o: number[] = [];
      for (let i = 1; i <= 6; i++) o.push(s.add(i));
      return o.join() === '1,1.5,2,2.5,3,3.5';
    },
  },
  {
    name: 'Descending stream',
    run: () => {
      const s = new Scoreboard();
      const o: number[] = [];
      for (let i = 6; i >= 1; i--) o.push(s.add(i));
      return o.join() === '6,5.5,5,4.5,4,3.5';
    },
  },
  {
    name: 'Heap sizes differ by at most one',
    run: () => {
      const s = new Scoreboard();
      for (let i = 0; i < 500; i++) {
        s.add(Math.floor(Math.random() * 50) - 25);
        const d = s.lo.size - s.hi.size;
        if (d < 0 || d > 1) return false;
      }
      return true;
    },
  },
  {
    name: 'Lower root ≤ upper root always',
    run: () => {
      const s = new Scoreboard();
      for (let i = 0; i < 500; i++) {
        s.add(Math.floor(Math.random() * 20) - 10);
        if (s.hi.size && s.lo.peek() > s.hi.peek()) return false;
      }
      return true;
    },
  },
  {
    name: '200 random streams match full sort',
    run: () => {
      for (let t = 0; t < 200; t++) {
        const s = new Scoreboard();
        const a: number[] = [];
        const n = 1 + Math.floor(Math.random() * 60);
        for (let i = 0; i < n; i++) {
          const x =
            Math.random() < 0.1
              ? Math.random() < 0.5
                ? MIN_INT32
                : MAX_INT32
              : Math.floor(Math.random() * 41) - 20;
          a.push(x);
          if (s.add(x) !== bruteMedian(a)) return false;
        }
      }
      return true;
    },
  },
  {
    name: '100,000 scores run and match final sort',
    run: () => {
      const d = generateRandomInt32(STREAM_LIMIT);
      const s = new Scoreboard();
      for (let i = 0; i < d.length; i++) s.add(d[i]);
      return s.count === STREAM_LIMIT && s.median() === bruteMedian(d);
    },
  },
  {
    name: 'Input parser rejects out-of-range and decimals',
    run: () => {
      const r = parseScores('1 2.5 abc 2147483648 -2147483649 3');
      return r.ok.join() === '1,3' && r.bad === 4;
    },
  },
  {
    name: 'Running mean matches exact sum / count in O(1)',
    run: () => {
      const s = new Scoreboard();
      const seq = [10, 20, 30, 1000000];
      let sum = 0;
      for (let i = 0; i < seq.length; i++) {
        s.add(seq[i]);
        sum += seq[i];
        if (s.mean() !== sum / (i + 1)) return false;
      }
      return s.median() === 25 && s.mean() === 250015;
    },
  },
  {
    name: '1.5 × IQR outlier rule flags extreme spike',
    run: () => {
      const s = new Scoreboard();
      [48, 50, 51, 52, 53, 55, 49, 54].forEach((v) => s.add(v));
      s.add(50000);
      return (
        s.outlierFlags[0] === false &&
        s.outlierFlags[s.outlierFlags.length - 1] === true
      );
    },
  },
  {
    name: 'Live-event score generator stays within 32-bit range',
    run: () => {
      const presets: ScenarioPresetId[] = [
        'normal',
        'biased',
        'outliers',
        'ties',
        'negatives',
        'single',
      ];
      for (const preset of presets) {
        for (let i = 0; i < 100; i++) {
          const val = generateJudgeScore(i % 9, preset);
          if (!Number.isInteger(val) || val < MIN_INT32 || val > MAX_INT32) {
            return false;
          }
        }
      }
      return true;
    },
  },
];
