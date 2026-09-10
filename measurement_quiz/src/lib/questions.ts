/**
 * The question bank, in three categories.
 *
 * A question is only its circuit source. The correct answer is never written
 * down — it is derived by simulating, so a question cannot disagree with its
 * own answer key, and varying the inputs year to year (which the course
 * requires) means editing one line and nothing else.
 *
 * The categories are the progression the Lecture 6-7 notes set out: measure one
 * qubit and count copies; measure several and read a joint outcome; measure only
 * some and discover that the rest keep their superposition.
 */

export type CategoryId = 'single' | 'joint' | 'partial';

export interface Category {
  id: CategoryId;
  title: string;
  blurb: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'single',
    title: 'One qubit',
    blurb:
      'Measuring a single qubit. Count the copies of each color to get the ' +
      'amplitude, and then square that number.',
  },
  {
    id: 'joint',
    title: 'Several qubits',
    blurb:
      'Measuring every qubit at once. Each outcome is one definite ' +
      'combination.',
  },
  {
    id: 'partial',
    title: 'Partial measurement',
    blurb:
      'Measuring only some of the qubits. Remember that the qubits you did ' +
      'not measure keep their superposition.',
  },
];

export interface Question {
  id: string;
  category: CategoryId;
  /** Shown above the figure. Sets up what is asked, not how to do it. */
  prompt: string;
  /** misty circuit source. Everything else is derived from this. */
  source: string;
  /**
   * Ask for the amplitude as well as the probability.
   *
   * Off for partial measurements. An outcome that keeps two terms has
   * amplitude √2, and this course never asks a student to write an irrational
   * number — the squared weight is the quantity the notes actually work in.
   * Turn it on for a partial question only if you want that conversation.
   */
  amplitude: boolean;
  /** The teaching point, revealed with the walk-through. */
  moral: string;
}

export const QUESTIONS: Question[] = [
  // ── One qubit ──────────────────────────────────────────────────────────
  {
    id: 'single-even',
    category: 'single',
    prompt: 'One qubit sits in a superposition, and you measure it.',
    source: 'in 0|1\nmeasure 1 Z',
    amplitude: true,
    moral:
      'There is one copy of each, so both amplitudes are 1 and both outcomes ' +
      'are equally likely. This is the only case where counting copies and ' +
      'counting probability give you the same answer, which is exactly why ' +
      'the next question is worth doing.',
  },
  {
    id: 'single-three',
    category: 'single',
    prompt: 'There are four terms here, so count them carefully.',
    source: 'in 0|0|0|1\nmeasure 1 Z',
    amplitude: true,
    moral:
      'You have three white copies and one black one, so the amplitudes are ' +
      '3 and 1. Squaring those gives 9 and 1, out of 10. The answer is not ' +
      '3/4 and 1/4: counting the copies gives you the amplitude, and the ' +
      'probability is that amplitude squared.',
  },
  {
    id: 'single-minus',
    category: 'single',
    prompt: 'One of the terms carries a minus sign.',
    source: 'in 0|0|0|-1\nmeasure 1 Z',
    amplitude: true,
    moral:
      'You get the same 9 and 1 out of 10 as before. The minus sign vanishes ' +
      'when you square it, so it changes nothing you can measure here. A sign ' +
      'belongs to the amplitude, not to the probability.',
  },

  // ── Several qubits, all measured ───────────────────────────────────────
  {
    id: 'joint-opposite',
    category: 'joint',
    prompt: 'You measure both qubits.',
    source: 'shape os\nin 01|10\nmeasure 1 Z; measure 2 Z',
    amplitude: true,
    moral:
      'The two qubits always disagree. Neither one has a color of its own ' +
      'before you look, and yet they are guaranteed to come out opposite. ' +
      'This is the first entangled state in the course.',
  },
  {
    id: 'joint-collect',
    category: 'joint',
    prompt: 'You measure both qubits, and one combination appears twice.',
    source: 'shape os\nin 00|01|01|10\nmeasure 1 Z; measure 2 Z',
    amplitude: true,
    moral:
      'The repeated term collects into a single possibility with amplitude ' +
      '2, which is worth 4 once you square it, against 1 each for the other ' +
      'two. So the answer is four out of six, not two out of four.',
  },
  {
    id: 'joint-minus',
    category: 'joint',
    prompt: 'You measure both qubits. Watch what the minus sign does.',
    source: 'shape os\nin 00|00|00|-11\nmeasure 1 Z; measure 2 Z',
    amplitude: true,
    moral:
      'Three copies of white-white give an amplitude of 3, so that outcome is ' +
      '9 out of 10. The minus sign on the black-black term disappears in the ' +
      'squaring, exactly as it did with a single qubit.',
  },

  // ── Partial measurement ────────────────────────────────────────────────
  {
    id: 'partial-tells-nothing',
    category: 'partial',
    prompt: 'You measure only the square. The circle passes straight through.',
    source: 'shape os\nin 00|10\nI 1; measure 2 Z',
    amplitude: false,
    moral:
      'The square is white in both terms, so measuring it is certain to come ' +
      'out white and tells you nothing at all. The circle is left exactly as ' +
      'it was, still in a superposition of white and black.',
  },
  {
    id: 'partial-collapses',
    category: 'partial',
    prompt: 'You measure only the square.',
    source: 'shape os\nin 00|01|01|10\nI 1; measure 2 Z',
    amplitude: false,
    moral:
      'The black-square outcome collects the two identical terms, so its ' +
      'amplitude is 2 and its probability is 4/6, and it leaves the circle ' +
      'definitely white. The white-square outcome collects two different ' +
      'terms instead, so it leaves the circle in a superposition of its own.',
  },
  {
    id: 'partial-minus',
    category: 'partial',
    prompt: 'You measure only the square. Watch where the minus sign ends up.',
    source: 'shape o^s\nin 010|011|100|-101\nI 1; I 2; measure 3 Z',
    amplitude: false,
    moral:
      'Both outcomes are equally likely. Measuring the square leaves the ' +
      'circle and the triangle entangled either way, and the minus sign ' +
      'survives into the second branch. It makes no difference to these ' +
      'probabilities, but it will matter the moment another gate acts.',
  },
];

export const byCategory = (id: CategoryId) =>
  QUESTIONS.filter((q) => q.category === id);

/**
 * The shapes a question's register uses, in order.
 *
 * Read off the `shape` directive so an answer cell can be drawn with the same
 * glyphs as the question. Without this, a three-qubit question written
 * `shape o^s` would have its answers drawn circle-square-triangle, and the
 * student would be matching a triangle against a square.
 */
const GLYPH: Record<string, string> = {
  o: 'circle',
  s: 'square',
  '^': 'triangle',
  d: 'diamond',
};

export function shapesOf(source: string): string[] | undefined {
  const line = source.split('\n').find((l) => l.trim().startsWith('shape '));
  if (!line) return undefined;
  const spec = line.trim().slice(6).trim();
  const out = [...spec].map((c) => GLYPH[c]).filter(Boolean) as string[];
  return out.length ? out : undefined;
}
