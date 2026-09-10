/**
 * Money or tiger, following Lecture 8.
 *
 * Two doors, labelled with a white square and a black square. There may be a
 * tiger behind one. The Oracle flips the circle if there is a tiger behind the
 * door the square selects — which for the black door is a plain CNOT with the
 * square controlling the circle.
 *
 * Everything the demo shows is simulated rather than written down, so the
 * circuit on screen and the answer it gives cannot disagree.
 *
 * Convention note: this follows the **lecture**, which starts `in 10` — circle
 * black, square white — and reads a black square as "tiger". Chapter 5 of the
 * notes starts `in 11` and reads a *white* square as "tiger". Both are
 * internally consistent; they are inverses of each other.
 */

import {
  parseCircuit,
  simulate,
  canonical,
  type Amplitudes,
} from 'misty-states/kernel';

/** Where the tiger is. `none` means both doors have money. */
export type Where = 'none' | 'white' | 'black';

export const WHERE: { id: Where; label: string; short: string }[] = [
  { id: 'none', label: 'No tiger — money behind both doors', short: 'No tiger' },
  { id: 'white', label: 'A tiger behind the white door', short: 'White door' },
  { id: 'black', label: 'A tiger behind the black door', short: 'Black door' },
];

/**
 * The Oracle, as circuit source.
 *
 * The black-door case is the lecture's `CNOT 2 -> 1`: the square is the control,
 * so the circle flips exactly when the square is black. The white-door case is
 * the same thing about the other door, so the control is inverted with a NOT
 * either side — three layers, because those gates share wires.
 */
export function oracle(where: Where): string {
  // With no tiger the oracle does nothing, and it draws as a bare gap in the
  // wires. That looks like no query happened, which is a shame — but misty's
  // `box` is a drawing with no operation behind it, so labelling the gap would
  // mean drawing one circuit and simulating another. Not worth the split.
  if (where === 'none') return 'I 1; I 2';
  if (where === 'black') return 'CNOT 2 -> 1 "Tiger?"';
  return 'X 2\nCNOT 2 -> 1 "Tiger?"\nX 2';
}

/** The whole algorithm: Hadamards, one query, Hadamards, read the square. */
export function quantumCircuit(where: Where, upTo: Stage = 'measure'): string {
  const lines = ['shape os', 'in 10'];
  if (upTo === 'start') return lines.join('\n');
  lines.push('H 1; H 2');
  if (upTo === 'superposed') return lines.join('\n');
  lines.push(oracle(where));
  if (upTo === 'queried') return lines.join('\n');
  lines.push('H 1; H 2');
  if (upTo === 'interfered') return lines.join('\n');
  lines.push('measure 2 Z');
  return lines.join('\n');
}

export type Stage = 'start' | 'superposed' | 'queried' | 'interfered' | 'measure';

export interface StageInfo {
  id: Stage;
  title: string;
  /** What is happening, in the lecture's terms. */
  say: string;
}

export const STAGES: StageInfo[] = [
  {
    id: 'start',
    title: 'Set up',
    say: 'The circle starts black. That is the part that matters — it is what gives the oracle nowhere to put its answer except the square.',
  },
  {
    id: 'superposed',
    title: 'Ask both at once',
    say: 'A Hadamard on each qubit. The square is now both doors at once, so one query will ask about both.',
  },
  {
    id: 'queried',
    title: 'One query',
    say: 'The oracle answers every possibility at once. Look at what changed: only the signs. Nothing you could measure yet.',
  },
  {
    id: 'interfered',
    title: 'Interfere',
    say: 'Hadamards again. Possibilities that landed on the same colour with opposite signs cancel, and one clean answer is left.',
  },
  {
    id: 'measure',
    title: 'Read the square',
    say: 'The square was the control — the qubit a CNOT never changes. It changed anyway. That is phase kickback.',
  },
];

/** Terms of a state, as misty source, for display. */
function stateOf(amps: Amplitudes): string {
  return canonical(amps)
    .map(([bits, amp]) => (amp.re < 0 ? `-${bits}` : bits))
    .join('|');
}

/** The state at one stage, written out. */
export function stateAt(where: Where, upTo: Stage): string {
  const doc = parseCircuit(quantumCircuit(where, upTo));
  return stateOf(simulate(doc, Number.MAX_SAFE_INTEGER));
}

/** What the square reads once the algorithm finishes. */
export function verdict(where: Where): { square: 0 | 1; tiger: boolean } {
  const bits = stateAt(where, 'interfered');
  const square = (bits.replace('-', '')[1] === '1' ? 1 : 0) as 0 | 1;
  return { square, tiger: square === 1 };
}

/** What one classical query reveals: did the circle come back flipped? */
export function classicalAnswer(where: Where, door: 'white' | 'black'): boolean {
  return where === door;
}
