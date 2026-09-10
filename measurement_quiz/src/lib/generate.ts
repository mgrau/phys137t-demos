/**
 * Random questions, one generator per category.
 *
 * Generated rather than drawn from a longer list because the point is
 * unlimited practice — the Lecture 7 notes call partial measurement "the
 * hardest mechanical skill in the first half of the course, and the only way
 * through is repetition", and a fixed bank runs out.
 *
 * Every candidate is simulated before being handed back, and rejected if it is
 * not worth answering: one outcome at 100% teaches nothing in the joint case,
 * and an answer needs to be reachable in a few drops. Rejecting is cheap, so
 * the constraints are checked rather than reasoned about.
 */

import { outcomesOf, type Outcome } from './grade';
import type { CategoryId, Question } from './questions';

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const upto = (n: number) => Math.floor(Math.random() * n);

/**
 * Sprinkle minus signs, one decision per *distinct possibility*.
 *
 * Signing individual terms instead would let a possibility's own copies cancel:
 * `-0|0|-0|1` writes three white terms that net to −1, so a student counting
 * copies gets 3 and is wrong. That is a question about *simplifying* a state —
 * a different one of the six rules — smuggled into a question about measuring
 * one. Presenting the already-simplified form keeps the two skills apart.
 *
 * Deciding per possibility still reaches two or more minus signs often, since
 * distinct possibilities get independent signs, and it keeps "count the copies"
 * a valid method.
 *
 * Never every possibility. An overall sign is a global phase, unobservable, and
 * `canonical` divides it straight back out.
 */
function signed(bits: string[], allow: boolean): string[] {
  if (!allow || bits.length < 2) return bits;
  const distinct = [...new Set(bits)];
  if (distinct.length < 2) return bits;
  // Never all of them, so the ceiling is one short.
  const max = distinct.length - 1;
  const roll = Math.random();
  const wanted = roll < 0.3 ? 0 : roll < 0.5 ? 1 : 2 + upto(Math.max(1, max - 1));
  const n = Math.min(wanted, max);
  const negative = new Set<string>();
  while (negative.size < n) negative.add(pick(distinct));
  return bits.map((b) => (negative.has(b) ? `-${b}` : b));
}

/** A superposition written as misty terms. */
function terms(bits: string[], allowMinus: boolean): string {
  const copies = [...bits];
  // One term repeated is what makes an amplitude bigger than 1, and that is the
  // whole lesson of the first two categories, so bias towards having a repeat.
  if (copies.length > 1 && Math.random() < 0.7) {
    copies.push(pick(copies));
  }
  return signed(copies, allowMinus).join('|');
}

const SHAPES2 = 'shape os';
const SHAPES3 = 'shape o^s';

function candidate(category: CategoryId): string {
  if (category === 'single') {
    const whites = 1 + upto(3);
    const blacks = 1 + upto(2);
    const bits = [
      ...Array(whites).fill('0'),
      ...Array(blacks).fill('1'),
    ];
    return `in ${signed(bits, true).join('|')}\nmeasure 1 Z`;
  }

  if (category === 'joint') {
    const all = ['00', '01', '10', '11'];
    const n = 3 + upto(2);
    const chosen: string[] = [];
    while (chosen.length < n) {
      const b = pick(all);
      if (!chosen.includes(b)) chosen.push(b);
    }
    return `${SHAPES2}\nin ${terms(chosen, true)}\nmeasure 1 Z; measure 2 Z`;
  }

  // Partial. Two qubits most of the time; occasionally three, which is where
  // the surviving minus sign gets interesting.
  if (Math.random() < 0.25) {
    const all = ['000', '001', '010', '011', '100', '101', '110', '111'];
    const chosen: string[] = [];
    while (chosen.length < 3 + upto(2)) {
      const b = pick(all);
      if (!chosen.includes(b)) chosen.push(b);
    }
    return `${SHAPES3}\nin ${terms(chosen, true)}\nI 1; I 2; measure 3 Z`;
  }
  const all = ['00', '01', '10', '11'];
  const chosen: string[] = [];
  while (chosen.length < 3 + upto(2)) {
    const b = pick(all);
    if (!chosen.includes(b)) chosen.push(b);
  }
  return `${SHAPES2}\nin ${terms(chosen, true)}\nI 1; measure 2 Z`;
}

/** Is this worth putting in front of a student? */
function usable(category: CategoryId, outcomes: Outcome[]): boolean {
  if (!outcomes.length) return false;
  // A single certain outcome is a fine *lesson* about learning nothing, but it
  // is in the fixed bank already; a random draw should have something to weigh.
  if (outcomes.length < 2) return category === 'partial' && Math.random() < 0.15;
  // Four rows to fill is enough; more is bookkeeping rather than understanding.
  if (outcomes.length > 4) return false;
  // Nothing so lopsided that a student could guess it.
  return outcomes.every((o) => o.percent >= 5);
}

export function randomQuestion(category: CategoryId): Question {
  for (let tries = 0; tries < 60; tries++) {
    const source = candidate(category);
    try {
      const { outcomes } = outcomesOf(source);
      if (!usable(category, outcomes)) continue;
      return {
        id: `random-${category}-${Date.now()}`,
        category,
        prompt:
          category === 'single'
            ? 'A fresh one. Count the copies.'
            : category === 'joint'
              ? 'A fresh one. Every qubit is measured.'
              : 'A fresh one. Only the last qubit is measured.',
        source,
        // Amplitudes stay whole numbers only while everything is measured; a
        // partial outcome that keeps two terms has amplitude √2.
        amplitude: category !== 'partial',
        moral:
          'Work it the same way: write the cloud out, split it by what the ' +
          'measured qubits read, square each branch, and read off what is left.',
      };
    } catch {
      // A candidate the simulator rejects is simply discarded.
    }
  }
  // Every draw failed, which should not happen — fall back to something valid
  // rather than throwing in the user's face.
  return {
    id: `random-${category}-fallback`,
    category,
    prompt: 'A fresh one.',
    source:
      category === 'single'
        ? 'in 0|0|1\nmeasure 1 Z'
        : category === 'joint'
          ? `${SHAPES2}\nin 00|01|01\nmeasure 1 Z; measure 2 Z`
          : `${SHAPES2}\nin 00|01|01|10\nI 1; measure 2 Z`,
    amplitude: category !== 'partial',
    moral: 'Same method as the fixed examples.',
  };
}
