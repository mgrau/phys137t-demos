/**
 * The derivation, as a list of steps.
 *
 * The point is to show the arithmetic happening rather than assert the answer:
 * walk the written terms one at a time, sort each into the outcome it belongs
 * to, merge the ones that are the same possibility, square, and divide. That is
 * the recipe from the Lecture 7 notes, in the order the notes give it.
 *
 * Terms come from the `in` line as *written*, not from the simulator, because
 * the repeats are the whole point — `00|01|01|10` has four terms and only three
 * possibilities, and the step that collapses the two `01`s into amplitude 2 is
 * the one students get wrong. A simulator hands back the merged state and the
 * lesson has already happened offstage.
 */

import { parseCircuit, type CircuitDoc } from 'misty-states/kernel';

export interface Term {
  /** Position in the written state, left to right. */
  index: number;
  bits: string;
  sign: 1 | -1;
  /** Offsets, in the state source, of this term's qubits. */
  ats: number[];
  /** What the measured qubits read — the outcome this term belongs to. */
  key: string;
}

export interface Bucket {
  key: string;
  /** Indices into `terms`, in the order they were collected. */
  terms: number[];
  /** Distinct possibilities and the amplitude each collected. */
  merged: { bits: string; amp: number }[];
  /**
   * The state this outcome leaves behind, as misty source.
   *
   * Not the same as the outcome's key. The key is only what the *measured*
   * qubits read; the state also carries whatever the unmeasured ones are still
   * in, which for a partial measurement is a superposition of their own. That
   * is the answer the table asks for, so the derivation has to end on it.
   *
   * Reduced by the common factor, because an overall scale is not observable:
   * a lone term collected twice is `01`, not `2*01`.
   */
  stateSource: string;
  /** Sum of squared amplitudes. */
  weight: number;
  percent: number;
}

export type Step =
  /** Highlight one written term and say where it goes. */
  | { kind: 'sort'; term: number; bucket: number }
  /** A possibility that appeared more than once, collapsed. */
  | { kind: 'merge'; bucket: number }
  /** Square the amplitudes of one outcome. */
  | { kind: 'square'; bucket: number }
  /** Add the weights up. */
  | { kind: 'total' }
  /** Divide through. */
  | { kind: 'divide' };

export interface Walk {
  /** Bare state source, for the figure the steps highlight. */
  stateSource: string;
  /** 1-based wires the circuit measures. */
  wires: number[];
  terms: Term[];
  buckets: Bucket[];
  steps: Step[];
  total: number;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/**
 * The same state, with the measured qubits factored out of the cloud.
 *
 * A measurement leaves its own qubits definite, so they do not belong inside
 * the superposition: `00|10` is better written `(0|1)0` — the circle is still
 * undecided, the square is white, and that is the whole point of a partial
 * measurement. Both forms grade the same, and `canonical` sees through the
 * difference.
 *
 * Returns null when the notation cannot express it: the cloud has to cover a
 * contiguous run, so a measured qubit sitting *between* two unmeasured ones has
 * no factored form and the flat one is used instead.
 */
function factoredOf(
  merged: { bits: string; amp: number }[],
  wires: number[],
  width: number,
): string | null {
  if (merged.length < 2) return null; // nothing to factor out of
  const measured = new Set(wires);
  const free: number[] = [];
  for (let i = 1; i <= width; i++) if (!measured.has(i)) free.push(i);
  if (!free.length) return null; // everything was measured
  // Contiguous, or misty cannot write the cloud.
  if (free[free.length - 1] - free[0] + 1 !== free.length) return null;

  const factor = merged.reduce((g, m) => gcd(g, m.amp), 0) || 1;
  const alts = merged.map(({ bits, amp }) => {
    const n = amp / factor;
    const mag = Math.abs(n);
    const inside = free.map((i) => bits[i - 1]).join('');
    return `${n < 0 ? '-' : ''}${mag === 1 ? '' : `${mag}*`}${inside}`;
  });
  // The measured qubits read the same in every term of a bucket, so any term
  // can supply them.
  const fixed = merged[0].bits;
  const before: string[] = [];
  const after: string[] = [];
  for (let i = 1; i <= width; i++) {
    if (!measured.has(i)) continue;
    (i < free[0] ? before : after).push(fixed[i - 1]);
  }
  return `${before.join('')}(${alts.join('|')})${after.join('')}`;
}

/**
 * Merged amplitudes written back out as state source, common factor removed.
 *
 * A lone term also loses its sign, because with nothing to be negative
 * *relative to* it is a global phase and cannot be measured — the simulator
 * normalises it away too, and the derivation has to agree.
 */
function stateOf(merged: { bits: string; amp: number }[]): string {
  if (!merged.length) return '';
  if (merged.length === 1) {
    const { bits } = merged[0];
    return bits;
  }
  const factor = merged.reduce((g, m) => gcd(g, m.amp), 0) || 1;
  return merged
    .map(({ bits, amp }) => {
      const n = amp / factor;
      const mag = Math.abs(n);
      return `${n < 0 ? '-' : ''}${mag === 1 ? '' : `${mag}*`}${bits}`;
    })
    .join('|');
}

/** Which wires the first measurement layer reads. */
function measuredWires(doc: CircuitDoc): number[] {
  let layer = -1;
  const wires: number[] = [];
  doc.layers.forEach((l, i) => {
    for (const g of l.gates ?? []) {
      if (g.kind !== 'measure') continue;
      if (layer < 0) layer = i;
      if (layer === i && typeof g.qubit === 'number') wires.push(g.qubit);
    }
  });
  return [...new Set(wires)].sort((a, b) => a - b);
}

/** The `in` line's state, and where each term's qubits sit in it. */
function readTerms(stateSource: string, wires: number[]): Term[] {
  const out: Term[] = [];
  let at = 0;
  stateSource.split('|').forEach((raw, index) => {
    const sign: 1 | -1 = raw.startsWith('-') ? -1 : 1;
    const bits = sign === -1 ? raw.slice(1) : raw;
    const base = at + (sign === -1 ? 1 : 0);
    out.push({
      index,
      bits,
      sign,
      ats: [...bits].map((_, k) => base + k),
      key: wires.map((w) => bits[w - 1]).join(''),
    });
    at += raw.length + 1; // the separator
  });
  return out;
}

export function walkthrough(source: string): Walk | null {
  const line = source.split('\n').find((l) => l.trim().startsWith('in '));
  if (!line) return null;
  const stateSource = line.trim().slice(3).trim();

  let doc: CircuitDoc;
  try {
    doc = parseCircuit(source);
  } catch {
    return null;
  }
  const wires = measuredWires(doc);
  if (!wires.length) return null;

  const terms = readTerms(stateSource, wires);
  if (terms.some((t) => t.key.includes('undefined') || t.key.length !== wires.length)) {
    return null;
  }

  // Buckets in the order the outcomes first appear, so the steps read
  // left-to-right along the written state.
  const buckets: Bucket[] = [];
  const byKey = new Map<string, number>();
  const steps: Step[] = [];

  terms.forEach((t) => {
    let b = byKey.get(t.key);
    if (b === undefined) {
      b = buckets.length;
      byKey.set(t.key, b);
      buckets.push({
        key: t.key,
        terms: [],
        merged: [],
        stateSource: '',
        weight: 0,
        percent: 0,
      });
    }
    buckets[b].terms.push(t.index);
    steps.push({ kind: 'sort', term: t.index, bucket: b });
  });

  // Merge identical possibilities inside each bucket, then square.
  for (const [b, bucket] of buckets.entries()) {
    const amps = new Map<string, number>();
    for (const i of bucket.terms) {
      const t = terms[i];
      amps.set(t.bits, (amps.get(t.bits) ?? 0) + t.sign);
    }
    bucket.merged = [...amps]
      .filter(([, amp]) => amp !== 0)
      .map(([bits, amp]) => ({ bits, amp }));
    bucket.weight = bucket.merged.reduce((a, m) => a + m.amp * m.amp, 0);
    const flat = stateOf(bucket.merged);
    bucket.stateSource =
      factoredOf(bucket.merged, wires, terms[0]?.bits.length ?? 0) ?? flat;
    // Only worth a step when something actually collapsed or cancelled.
    if (bucket.terms.length > bucket.merged.length) {
      steps.push({ kind: 'merge', bucket: b });
    }
  }
  for (const b of buckets.keys()) steps.push({ kind: 'square', bucket: b });

  const total = buckets.reduce((a, x) => a + x.weight, 0);
  for (const bucket of buckets) {
    bucket.percent = total ? (100 * bucket.weight) / total : 0;
  }
  steps.push({ kind: 'total' });
  steps.push({ kind: 'divide' });

  return { stateSource, wires, terms, buckets, steps, total };
}

/** How an outcome is named in prose: "the square reads black". */
export function readsAs(key: string, wires: number[], shapes: string[]): string {
  return wires
    .map((w, i) => {
      const shape = shapes[w - 1] ?? `qubit ${w}`;
      return `the ${shape} reads ${key[i] === '1' ? 'black' : 'white'}`;
    })
    .join(' and ');
}
