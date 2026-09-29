import { amplitudesOf, canonical, gateQubits, parseCircuit, parseState, simulate, simulateBranches, type Amplitudes, type CircuitDoc, type StateRow } from 'misty-states/kernel';
import type { Question } from './questions';

export interface Answer { selected: number[]; values: string[]; text: string }
export const emptyAnswer = (): Answer => ({ selected: [], values: [], text: '' });
export interface Verdict { status: 'correct' | 'incorrect' | 'incomplete'; message: string }
export interface Expected { state?: Amplitudes; values?: number[]; rows?: string[] }
const ALL = Number.MAX_SAFE_INTEGER;
export const sameState = (a: Amplitudes, b: Amplitudes) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const matches = (bits: string, pattern: string) => [...pattern].every((p, i) => p === '?' || p === bits[i]);

/** Read the actual width before misty's amplitudesOf can pad a short answer. */
function widths(row: StateRow): number[] {
  type Factor = StateRow['sides'][number]['factors'][number];
  function factor(f: Factor): number[] {
    if (f.kind === 'qubit') return [1];
    if (f.kind === 'op') return [0];
    if (f.kind === 'label') throw new Error('Use qubits and clouds in the state.');
    return f.terms.flatMap(t => product(t.factors));
  }
  function product(fs: Factor[]): number[] {
    return fs.reduce<number[]>((sums, f) => sums.flatMap(s => factor(f).map(n => s + n)), [0]);
  }
  if (row.sides.length !== 1 || row.relations.length) throw new Error('Enter one state, without an equals sign.');
  return product(row.sides[0].factors);
}

export function readState(source: string, qubits: number): Amplitudes {
  if (!source.trim() || source.includes('?')) throw new Error('Fill every qubit with white or black.');
  if (source.length > 1200) throw new Error('Please use a smaller state expression.');
  if (/[@"#\n]/.test(source)) throw new Error('Use a single state expression in the displayed shape order.');
  const doc = parseState(source);
  if (doc.rows.length !== 1) throw new Error('Enter one state.');
  if (widths(doc.rows[0]).some(n => n !== qubits)) throw new Error(`Every complete possibility must contain ${qubits} qubit${qubits === 1 ? '' : 's'}.`);
  const amps = amplitudesOf(doc.rows[0], qubits);
  if (!amps.size) throw new Error('All terms cancel. Add a surviving possibility.');
  return amps;
}

export function stateSource(amps: Amplitudes): string {
  // Serialize the library's exact amplitudes, preserving relative signs and weights.
  return canonical(amps).flatMap(([bits, a]) => {
    const term = (n: number, imaginary: boolean) => {
      const weight = Math.abs(n);
      return `${n < 0 ? '-' : ''}${imaginary ? `${weight === 1 ? '' : weight}i*` : weight === 1 ? '' : `${weight}*`}${bits}`;
    };
    return [...(a.re ? [term(a.re, false)] : []), ...(a.im ? [term(a.im, true)] : [])];
  }).join('|');
}

export function diagramOf(q: Question): string {
  if (q.diagram) return `shape ${q.shapes}\n${q.diagram}`;
  if (q.kind === 'circuit') return `shape ${q.shapes}\nin ${q.input}\nblank ${q.qubits === 1 ? '1' : `1-${q.qubits}`}\nout ${q.target}`;
  return q.circuit ? `shape ${q.shapes}\n${q.circuit}` : '';
}

export function prepared(q: Question): Amplitudes {
  const doc = parseCircuit(`qubits ${q.qubits}\n${q.circuit}`);
  if (doc.qubits !== q.qubits) throw new Error(`${q.id}: circuit width differs from qubits.`);
  if (doc.layers.some(l => l.gates.some(g => g.kind === 'measure'))) throw new Error(`${q.id}: put the measurement condition in given, not circuit.`);
  const amps = simulate(doc, ALL);
  if (!q.given) return amps;
  const measurements = [...q.given].flatMap((v, i) => v === '?' ? [] : [`measure ${i + 1} Z`]);
  const { branches } = simulateBranches(parseCircuit(`qubits ${q.qubits}\n${q.circuit}\n${measurements.join('\n')}`), ALL);
  const branch = branches.find(b => [...b.amps.keys()].every(bits => matches(bits, q.given!)));
  if (!branch) throw new Error(`${q.id}: the given measurement outcome is impossible.`);
  return branch.amps;
}

export function expected(q: Question): Expected {
  if (q.kind === 'state') return { state: prepared(q) };
  if (q.kind === 'circuit') return { state: readState(q.target!, q.qubits) };
  if (q.kind === 'number') return { values: q.fields!.map(f => f.value) };
  if (q.kind === 'probability') {
    const amps = prepared(q);
    // The library performs all measurement and amplitude arithmetic. Here we
    // only combine branch probabilities for events such as "square black".
    const measures = Array.from({ length: q.qubits }, (_, i) => `measure ${i + 1} Z`).join('\n');
    const { branches } = simulateBranches(parseCircuit(`in ${stateSource(amps)}\n${measures}`), ALL);
    return { values: q.events!.map(e => branches.filter(b => matches([...b.amps.keys()][0], e.pattern)).reduce((p, b) => p + b.odds.n / b.odds.d, 0)) };
  }
  if (q.kind === 'truth-table') {
    const base = parseCircuit(`qubits ${q.qubits}\n${q.circuit}`);
    if (base.layers.some(l => l.gates.some(g => !['identity','single','controlled','swap'].includes(g.kind) || (g.kind === 'single' && !['X','NOT'].includes(g.label))))) throw new Error(`${q.id}: truth tables require classical reversible gates.`);
    const rows = Array.from({ length: 2 ** q.qubits }, (_, i) => i.toString(2).padStart(q.qubits, '0'));
    const values = rows.map(input => {
      const result = canonical(simulate({ ...base, input: parseState(input).rows[0] }, ALL));
      if (result.length !== 1) throw new Error(`${q.id}: nonclassical truth-table output.`);
      return parseInt(result[0][0], 2);
    });
    return { rows, values };
  }
  return {};
}

/** No eval: accept signed decimals, scientific notation, fractions and %. */
export function numeric(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '').replace(/−/g, '-');
  const atom = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?';
  const match = s.match(new RegExp(`^(${atom})(?:/(${atom}))?(%)?$`, 'i'));
  if (!match) return null;
  const v = Number(match[1]) / (match[2] === undefined ? 1 : Number(match[2])) / (match[3] ? 100 : 1);
  return Number.isFinite(v) ? v : null;
}

export function studentCircuit(q: Question, gates: string): CircuitDoc {
  if (gates.length > 1200) throw new Error('Please use a shorter circuit.');
  const lines = gates.split(/[\n;]/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Add at least one gate.');
  if (lines.length > q.maxGates) throw new Error(`Use at most ${q.maxGates} gates.`);
  for (const line of lines) {
    const m = line.match(/^(H|X|NOT|CNOT|SWAP|TOFFOLI)\s+(\d+(?:\s+(?:->\s*)?\d+)*)$/);
    if (!m || !q.gates!.includes(m[1] === 'NOT' ? 'X' : m[1])) throw new Error('Use the allowed gates with their wire numbers.');
  }
  const doc = parseCircuit(`qubits ${q.qubits}\nin ${q.input}\n${lines.join('\n')}`);
  if (doc.qubits !== q.qubits || doc.layers.some(l => l.gates.some(g => {
    const wires = gateQubits(g);
    return wires.some(n => n < 1 || n > q.qubits) || new Set(wires).size !== wires.length;
  }))) throw new Error('Choose distinct wires from the given register.');
  return doc;
}

export function grade(q: Question, answer: Answer): Verdict {
  const incomplete = (message: string): Verdict => ({ status: 'incomplete', message });
  let correct = false;
  try {
    const key = expected(q);
    if (q.kind === 'choice') {
      if (!answer.selected.length) return incomplete('Select an answer first.');
      correct = JSON.stringify([...new Set(answer.selected)].sort()) === JSON.stringify([...q.answer!].sort());
    } else if (q.kind === 'state') {
      correct = sameState(readState(answer.text, q.qubits), key.state!);
    } else if (q.kind === 'circuit') {
      correct = sameState(simulate(studentCircuit(q, answer.text), ALL), key.state!);
    } else if (q.kind === 'truth-table') {
      if (key.rows!.some((_, i) => !new RegExp(`^[01]{${q.qubits}}$`).test(answer.values[i] ?? ''))) return incomplete('Fill every output qubit in the truth table.');
      correct = key.values!.every((n, i) => parseInt(answer.values[i], 2) === n);
    } else {
      const values = key.values!.map((_, i) => numeric(answer.values[i] ?? ''));
      if (values.some(v => v === null)) return incomplete('Fill every answer with a number or fraction.');
      if (q.kind === 'probability' && values.some(v => v! < 0 || v! > 1)) return incomplete('Probabilities run from 0 to 1. Write a percentage with %, such as 50%.');
      if (q.kind === 'probability') {
        const disjoint = Array.from({ length: 2 ** q.qubits }, (_, i) => i.toString(2).padStart(q.qubits, '0')).every(bits => q.events!.filter(e => matches(bits, e.pattern)).length <= 1);
        const complete = disjoint && Math.abs(key.values!.reduce((a,b) => a+b, 0) - 1) < 1e-10;
        if (complete && Math.abs(values.reduce<number>((sum,v) => sum + v!, 0) - 1) > 0.005) return { status: 'incorrect', message: 'These outcomes cover the whole experiment. Their probabilities should add to 1 (100%).' };
      }
      correct = key.values!.every((v, i) => Math.abs(v - values[i]!) <= (q.kind === 'probability' ? 0.005 : 1e-9));
    }
  } catch (error) { return incomplete(error instanceof Error ? error.message : 'Finish your answer before checking.'); }
  return correct ? { status: 'correct', message: 'Correct. Nicely worked.' } : { status: 'incorrect', message: 'Not quite. Revise your answer and check again.' };
}

export function fraction(n: number): string {
  for (let d = 1; d <= 10000; d++) { const a = Math.round(n * d); if (Math.abs(a / d - n) < 1e-10) return d === 1 ? `${a}` : `${a}/${d}`; }
  return n.toFixed(4);
}
export function finalStep(q: Question): string {
  const key = expected(q);
  if (q.kind === 'choice') return `### Answer\n\n${q.answer!.map(i => {
    const option = q.options![i - 1];
    return typeof option === 'string' ? `- ${option}` : `${option.label}\n\n\`\`\`misty\nshape ${q.shapes}\n${option.state}\n\`\`\``;
  }).join('\n\n')}`;
  if (q.kind === 'circuit') return `### One valid circuit\n\nOther circuits that prepare the same state also count.\n\n\`\`\`misty\nshape ${q.shapes}\nin ${q.input}\n${q.example}\nout calculate\n\`\`\``;
  if (q.kind === 'state') return `### Result\n\nEquivalent ordering, factoring, overall sign and common scale all count.\n\n\`\`\`misty\nshape ${q.shapes}\n${stateSource(key.state!)}\n\`\`\``;
  if (q.kind === 'truth-table') return `### Completed table\n\n| Input | Output |\n|---|---|\n${key.rows!.map((r,i) => `| \`misty: ${r}\` | \`misty: ${key.values![i].toString(2).padStart(q.qubits, '0')}\` |`).join('\n')}\n\nKeep the displayed shape order.`;
  const labels = q.kind === 'number' ? q.fields!.map(f => f.label) : q.events!.map(e => e.label);
  return `### Answer\n\n${labels.map((label,i) => `- **${label}:** ${fraction(key.values![i])}${q.kind === 'probability' ? ` (≈ ${(100 * key.values![i]).toFixed(2)}%)` : ''}`).join('\n')}`;
}

export function validatePhysics(q: Question) {
  expected(q);
  for (const option of q.options ?? []) if (typeof option !== 'string') readState(option.state, q.qubits);
  if (q.kind === 'circuit' && grade(q, { ...emptyAnswer(), text: q.example! }).status !== 'correct') throw new Error(`${q.id}: example circuit does not prepare target.`);
}
