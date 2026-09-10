/**
 * Marking a filled-in outcome table.
 *
 * Three things get checked, and they are deliberately kept apart, because a
 * student can be wrong in one without being wrong in the others:
 *
 *   1. Is each row a real outcome of this circuit?
 *   2. Is its probability right, to within a percentage point?
 *   3. Do the probabilities add up to 100%?
 *
 * The third is not implied by the second. Every row can be inside tolerance and
 * the column still not be a distribution — that is worth saying out loud rather
 * than passing silently, because "these are probabilities and they must total
 * one" is half the lesson.
 *
 * Nothing here throws. An unparseable or half-built cell is `pending`, not
 * `wrong`: a student mid-answer has not made a mistake yet, and colouring the
 * row red while they are still building it teaches them to fear the widget.
 */

import {
  amplitudesOf,
  canonical,
  parseState,
  simulate,
  simulateBranches,
  oddsLabel,
  parseCircuit,
  type Branch,
  type CircuitDoc,
} from 'misty-states/kernel';

/** Every outcome counts as correct within this many percentage points. */
export const TOLERANCE = 1;

/**
 * Amplitudes are small numbers, so a point of slack would swallow the whole
 * answer. Loose enough for 1.41 to pass for √2, tight enough that 1 and 2 stay
 * distinct.
 */
export const AMP_TOLERANCE = 0.05;

export interface Outcome {
  /** Canonical form, for comparison. Never shown. */
  shape: string;
  /** misty source for the state, e.g. `00|10`. */
  source: string;
  percent: number;
  label: string;
  /**
   * The amplitude this outcome collected, before squaring, as its square.
   *
   * Held squared because that is the quantity that is always a whole number —
   * an outcome keeping two terms has amplitude √2. `ampLabel` renders it the
   * way the notes would write it.
   */
  ampSquared: number | null;
  ampLabel: string | null;
}

export interface Row {
  /** What the student built, as misty state source. May be ''. */
  state: string;
  /** What they typed. May be ''. */
  percent: string;
  /** What they typed in the amplitude column, when the question asks. */
  amp: string;
}

export type RowVerdict =
  | { kind: 'pending'; why: string }
  | { kind: 'wrong'; why: string }
  | { kind: 'right'; matched: number }
  | { kind: 'duplicate'; matched: number }
  | { kind: 'close'; matched: number; why: string };

export interface Report {
  rows: RowVerdict[];
  /** Outcomes with no row claiming them. */
  missing: number;
  /** Sum of the parsed percentages, or null if none parsed. */
  total: number | null;
  totalOk: boolean;
  /** Everything right and nothing missing. */
  solved: boolean;
}

const shapeOf = (amps: Parameters<typeof canonical>[0]) =>
  JSON.stringify(canonical(amps));

/**
 * The amplitude each outcome collected, keyed by the measured qubits' bits.
 *
 * This cannot be recovered from a branch's `odds`, which misty has already
 * reduced: measuring the square of `00|01|01|10` gives odds of 1/3 and 2/3, and
 * the amplitudes are √2 and 2 against a total of 6, not √1 and √2 against 3.
 * So it is computed the way the notes compute it — take the state *just before*
 * the measurement, group its terms by what the measured qubits read, and add up
 * the squares.
 */
function amplitudeSquares(doc: CircuitDoc): Map<string, number> | null {
  let layer = -1;
  const wires: number[] = [];
  doc.layers.forEach((l, i) => {
    for (const g of l.gates ?? []) {
      if (g.kind !== 'measure') continue;
      if (layer < 0) layer = i;
      if (layer === i && typeof g.qubit === 'number') wires.push(g.qubit);
    }
  });
  if (layer < 0 || !wires.length) return null;
  let pre;
  try {
    pre = simulate(doc, layer);
  } catch {
    // A circuit that measures more than once has no single "just before".
    return null;
  }
  const read = [...new Set(wires)].sort((a, b) => a - b);
  const out = new Map<string, number>();
  for (const [bits, amp] of pre) {
    const key = read.map((w) => bits[w - 1]).join('');
    out.set(key, (out.get(key) ?? 0) + amp.re * amp.re + amp.im * amp.im);
  }
  return out;
}

/** `4` -> "2"; `2` -> "√2". The notes would write it this way. */
function ampLabelOf(sq: number): string {
  const root = Math.sqrt(sq);
  return Number.isInteger(root) ? String(root) : `\u221a${sq}`;
}

/** The circuit's outcomes, in the order misty produces them. */
export function outcomesOf(source: string): {
  doc: CircuitDoc;
  qubits: number;
  outcomes: Outcome[];
} {
  const doc = parseCircuit(source);
  const { branches } = simulateBranches(doc, Number.MAX_SAFE_INTEGER);
  const qubits = widthOf(branches);
  const squares = amplitudeSquares(doc);
  // Branch order and measured-bit order both follow the simulator, so the two
  // line up; keyed lookup rather than index to avoid relying on that.
  const keys = squares ? [...squares.keys()] : [];
  return {
    doc,
    qubits,
    outcomes: branches.map((b, i) => {
      const sq = squares && i < keys.length ? squares.get(keys[i]) ?? null : null;
      return {
        shape: shapeOf(b.amps),
        source: sourceOf(b),
        percent: (b.odds.n * 100) / b.odds.d,
        label: oddsLabel(b.odds),
        ampSquared: sq,
        ampLabel: sq === null ? null : ampLabelOf(sq),
      };
    }),
  };
}

function widthOf(branches: Branch[]): number {
  for (const b of branches) {
    for (const bits of b.amps.keys()) return bits.length;
  }
  return 0;
}

/** A branch written back out as state source, for the walk-through. */
function sourceOf(b: Branch): string {
  return canonical(b.amps)
    .map(([bits, amp]) => (amp.re < 0 ? `-${bits}` : bits))
    .join('|');
}

/**
 * How many qubits a state actually describes.
 *
 * `amplitudesOf` pads a narrow state up to the circuit's width with white
 * qubits, and throws only when the state is too *wide*. So it accepts a
 * half-built `0` in a two-qubit question by silently reading it as `00` — which
 * would mark a student wrong for not having finished typing. The smallest width
 * it accepts is the real one, and at these sizes finding it by walking up from
 * one costs nothing.
 */
function naturalWidth(row: Parameters<typeof amplitudesOf>[0], max: number): number {
  for (let w = 1; w <= max; w++) {
    try {
      amplitudesOf(row, w);
      return w;
    } catch {
      // Too wide for w; try the next.
    }
  }
  return max;
}

/**
 * The canonical form of a state the student built, or null if it is not yet a
 * state. `null` means "keep going", never "wrong".
 */
export function studentShape(state: string, qubits: number): string | null {
  const text = state.trim();
  if (!text) return null;
  try {
    const doc = parseState(text);
    const row = doc.rows[0];
    if (!row) return null;
    // Still narrower than the register: unfinished, not incorrect.
    if (naturalWidth(row, qubits) < qubits) return null;
    const amps = amplitudesOf(row, qubits);
    if (!amps.size) return null;
    for (const bits of amps.keys()) {
      // A blank left in the answer is not an outcome yet.
      if (bits.includes('?')) return null;
      // Terms of unequal width mean a term is still short — misty pads only
      // when every term already agrees, so `00|1` arrives as widths 2 and 1.
      // That is exactly what a student has half way through adding a second
      // term, and it must not read as a wrong answer.
      if (bits.length !== qubits) return null;
    }
    return shapeOf(amps);
  } catch {
    return null;
  }
}

function parsePercent(text: string): number | null {
  const t = text.trim().replace(/%$/, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function grade(
  rows: Row[],
  outcomes: Outcome[],
  qubits: number,
  wantAmplitude = false,
): Report {
  const verdicts: RowVerdict[] = [];
  const claimed = new Set<number>();
  let total: number | null = null;

  for (const row of rows) {
    const shape = studentShape(row.state, qubits);
    const pct = parsePercent(row.percent);
    if (pct !== null) total = (total ?? 0) + pct;

    if (shape === null) {
      verdicts.push({ kind: 'pending', why: 'Build an outcome here.' });
      continue;
    }

    const matched = outcomes.findIndex((o) => o.shape === shape);
    if (matched < 0) {
      verdicts.push({
        kind: 'wrong',
        why: 'This state is not one the circuit can leave behind.',
      });
      continue;
    }
    if (claimed.has(matched)) {
      verdicts.push({ kind: 'duplicate', matched });
      continue;
    }
    claimed.add(matched);

    if (pct === null) {
      verdicts.push({ kind: 'pending', why: 'Add its probability.' });
      continue;
    }
    const off = Math.abs(pct - outcomes[matched].percent);
    if (off > TOLERANCE) {
      verdicts.push({
        kind: 'close',
        matched,
        why: `The outcome is right; the probability is off by ${off.toFixed(1)} points.`,
      });
      continue;
    }

    if (wantAmplitude && outcomes[matched].ampSquared !== null) {
      const want = Math.sqrt(outcomes[matched].ampSquared as number);
      const got = parsePercent(row.amp);
      if (got === null) {
        verdicts.push({ kind: 'pending', why: 'Add its amplitude.' });
        continue;
      }
      // Compared on magnitude. A minus sign on an amplitude is real but
      // unobservable here — it vanishes in the squaring, which is the point
      // the question is making, so penalising its absence would teach the
      // opposite lesson.
      if (Math.abs(Math.abs(got) - want) > AMP_TOLERANCE) {
        verdicts.push({
          kind: 'close',
          matched,
          why: `The outcome and its probability are right, but the amplitude is not — remember the probability is the amplitude *squared*.`,
        });
        continue;
      }
    }

    verdicts.push({ kind: 'right', matched });
  }

  const missing = outcomes.length - claimed.size;
  // Only judge the total once every outcome is accounted for. Complaining that
  // three rows do not add to 100 while a fourth is still empty is noise.
  const totalOk =
    total !== null && missing === 0 && Math.abs(total - 100) <= TOLERANCE;

  return {
    rows: verdicts,
    missing,
    total,
    totalOk,
    solved:
      missing === 0 &&
      totalOk &&
      verdicts.length > 0 &&
      verdicts.every((v) => v.kind === 'right'),
  };
}
