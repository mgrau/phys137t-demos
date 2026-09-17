import { canonical, parseCircuit, simulate, simulateBranches, type Amplitudes } from 'misty-states/kernel';
import { ORACLE_GATE, oracle, oracleOutput, type Where } from './game';

export type OracleView = 'oracle' | 'inside';
export type Hadamards = [boolean, boolean, boolean, boolean];
export type InitialState = '00' | '01' | '10' | '11';

export function toggleInput(input: InitialState, wire: number): InitialState {
  return [...input].map((bit, i) => i === wire ? (bit === '0' ? '1' : '0') : bit).join('') as InitialState;
}

export interface QuantumStep {
  title: string;
  instruction: string;
  state: string;
  /** -1 is the input; all other values address a visible circuit layer. */
  layer: number;
}

export interface Measurement {
  square: '0' | '1';
  circle: '0' | '1';
  probability: number;
  state: string;
}

/** Keep relative signs and weights, including the oracle's phase kickback. */
export function stateSource(amps: Amplitudes): string {
  return canonical(amps, { keepSign: true }).map(([bits, amp]) => {
    const coefficient = Math.abs(amp.re);
    return `${amp.re < 0 ? '-' : ''}${coefficient === 1 ? '' : `${coefficient}*`}${bits}`;
  }).join('|');
}

/** Extend the same basis-state oracle rule linearly to a superposition. */
export function applyOracle(where: Where, input: Amplitudes): Amplitudes {
  return new Map([...input].map(([bits, amplitude]) => [
    bits[0] + oracleOutput(where, bits[0] as '0' | '1', bits[1] as '0' | '1'),
    amplitude,
  ]));
}

function hadamardRow(square: boolean, circle: boolean, drawing = false): string {
  const empty = drawing ? 'blank' : 'I';
  return `${square ? 'H' : empty} 1; ${circle ? 'H' : empty} 2`;
}

function applyRow(input: Amplitudes, source: string): Amplitudes {
  return simulate(parseCircuit(`in ${stateSource(input)}\n${source}`), Number.MAX_SAFE_INTEGER);
}

/** One display row per step, with behavior independent of the oracle artwork. */
export function quantumExperiment(where: Where, gates: Hadamards, view: OracleView, input: InitialState = '01') {
  const inside = oracle(where).split('\n');
  const shownOracle = view === 'inside' ? inside : [ORACLE_GATE];
  const circuit = [
    'shape so', `in ${input}`,
    hadamardRow(gates[0], gates[1], true),
    ...shownOracle,
    hadamardRow(gates[2], gates[3], true),
    'measure 1 Z; measure 2 Z',
  ].join('\n');
  let amps = simulate(parseCircuit(`in ${input}`), 0);
  const steps: QuantumStep[] = [{
    title: 'Prepare', layer: -1, state: stateSource(amps),
    instruction: `Start with a ${input[0] === '0' ? 'white' : 'black'} square and a ${input[1] === '0' ? 'white' : 'black'} circle. Click either input qubit to change its color. Follow the circuit from top to bottom.`,
  }];
  const push = (title: string, instruction: string) => steps.push({
    title, instruction, state: stateSource(amps), layer: steps.length - 1,
  });
  amps = applyRow(amps, hadamardRow(gates[0], gates[1]));
  push('Before the oracle', gates[0] && gates[1]
    ? input[1] === '1'
      ? 'The square includes both door colors. The circle’s opposite signs let the oracle change the relative signs of the state.'
      : 'The square includes both door colors, but the circle has matching signs. Flipping this circle state leaves it unchanged; try starting with a black circle.'
    : gates[0] || gates[1]
      ? 'Only the qubit with an H changes. Try an H on each input and compare the state.'
      : 'Empty slots leave the state unchanged. Add an H to a slot to create a superposition.');
  if (view === 'inside') {
    for (const [index, source] of inside.entries()) {
      amps = applyRow(amps, source);
      push(inside.length === 1 ? 'Inside the oracle' : `Inside the oracle · ${index + 1} of ${inside.length}`,
        source.startsWith('I') ? 'The two identity gates leave both qubits unchanged.'
          : source.startsWith('X') ? 'This NOT flips the square. The two NOTs make the CNOT respond to the white door.'
          : 'The CNOT flips the circle in each part of the state whose square is black.');
    }
  } else {
    amps = applyOracle(where, amps);
    push('One oracle query', 'In every part of the state, the circle flips exactly when the square selects the tiger door. Compare the signs as well as the colors.');
  }
  amps = applyRow(amps, hadamardRow(gates[2], gates[3]));
  push('After the oracle', gates[2] || gates[3]
    ? 'The added Hadamards recombine amplitudes. Opposite contributions cancel. Predict the two measured colors.'
    : 'No Hadamards follow the oracle. Predict what measuring the two qubits will reveal.');

  // Sample a joint branch, rather than sampling the two colors independently.
  // This preserves correlations when the qubits are entangled.
  const { branches } = simulateBranches(parseCircuit(`in ${stateSource(amps)}\nmeasure 1 Z; measure 2 Z`), 1);
  const outcomes: Measurement[] = branches.map(({ amps: output, odds }) => ({
    square: [...output.keys()][0][0] as '0' | '1',
    circle: [...output.keys()][0][1] as '0' | '1',
    probability: odds.n / odds.d,
    state: stateSource(output),
  }));
  push('Measure both qubits', 'Each detector reads one qubit’s color. A superposition gives one randomly chosen pair, with probabilities set by its amplitudes. With a working circuit and input, the square carries the answer about the doors.');
  return { circuit, steps, outcomes, oracleLayers: shownOracle.length };
}

/** Certify the circuit across the whole promise, not just the hidden case. */
export function distinguishesCases(gates: Hadamards, input: InitialState = '01'): boolean {
  return (['none', 'white', 'black'] as const).every((where) => {
    const { outcomes } = quantumExperiment(where, gates, 'oracle', input);
    // The answer is whether the square changed, not a fixed output color.
    const expected = where === 'none' ? input[0] : input[0] === '0' ? '1' : '0';
    return outcomes.every((outcome) => outcome.square === expected);
  });
}

export function sampleMeasurement(outcomes: Measurement[], random = Math.random()): Measurement {
  let cumulative = 0;
  for (const outcome of outcomes) {
    cumulative += outcome.probability;
    if (random < cumulative) return outcome;
  }
  return outcomes[outcomes.length - 1];
}
