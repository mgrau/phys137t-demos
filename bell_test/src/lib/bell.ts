/**
 * The PS5 / Lecture 10 game (a Hardy-style Bell test).
 * Shapes and all quantum predictions use misty-states. Only the experimental
 * protocol, local answer sheets, random sampling, and bookkeeping live here.
 */
import { parseCircuit, simulate, type Amplitudes } from 'misty-states/kernel';

export type Bit = 0 | 1;
export type Mode = 'local' | 'quantum';
export type Setting = 'HH' | 'HT' | 'TH' | 'TT';
export type Outcome = '00' | '01' | '10' | '11';
export type Kind = 'allowed' | 'failure' | 'point';
/** Alice heads, Alice tails, Bob heads, Bob tails. */
export type Plan = [Bit, Bit, Bit, Bit];
export const SETTINGS: Setting[] = ['HH', 'HT', 'TH', 'TT'];
export const OUTCOMES: Outcome[] = ['00', '01', '10', '11'];
export const SHARED_CLOUD = '00|01|10';
export const EVENT: Record<Setting, Outcome> = { HH: '11', HT: '01', TH: '10', TT: '11' };
export const COINS = { H: 'Heads', T: 'Tails' } as const;
export const COLORS = ['white', 'black'] as const;

export function settingLabel(setting: Setting): string {
  return `${COINS[setting[0] as 'H' | 'T']}, ${COINS[setting[1] as 'H' | 'T']}`;
}
export function outcomeLabel(outcome: Outcome): string {
  return `${COLORS[Number(outcome[0])]}, ${COLORS[Number(outcome[1])]}`;
}
export function classify(setting: Setting, outcome: Outcome): Kind {
  return outcome === EVENT[setting] ? (setting === 'TT' ? 'point' : 'failure') : 'allowed';
}
export function localOutcome(plan: Plan, setting: Setting): Outcome {
  // Each player uses only their own coin. No remote setting is read.
  const alice = plan[setting[0] === 'H' ? 0 : 1];
  const bob = plan[setting[1] === 'H' ? 2 : 3];
  return `${alice}${bob}` as Outcome;
}
export function localGates(setting: Setting): string {
  return `${setting[0] === 'T' ? 'H' : 'I'} 1; ${setting[1] === 'T' ? 'H' : 'I'} 2`;
}
export function preparation(setting: Setting): string {
  return `shape os\nin ${SHARED_CLOUD}\n${localGates(setting)}`;
}

function cloudOf(amplitudes: Amplitudes): string {
  const parts: string[] = [];
  for (const [bits, amplitude] of [...amplitudes].sort(([a], [b]) => a.localeCompare(b))) {
    if (amplitude.im !== 0 || !Number.isInteger(amplitude.re)) {
      throw new Error('This activity expects real, whole-number cloud counts.');
    }
    for (let i = 0; i < Math.abs(amplitude.re); i++) {
      parts.push(`${amplitude.re < 0 ? '-' : ''}${bits}`);
    }
  }
  return parts.join('|');
}

export interface Prediction {
  cloud: string;
  weights: Record<Outcome, number>;
  total: number;
}
const quantum = Object.fromEntries(SETTINGS.map((setting) => {
  const amplitudes = simulate(parseCircuit(preparation(setting)), Number.MAX_SAFE_INTEGER);
  const weights = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<Outcome, number>;
  for (const [bits, amplitude] of amplitudes) {
    weights[bits as Outcome] = amplitude.re ** 2 + amplitude.im ** 2;
  }
  return [setting, { cloud: cloudOf(amplitudes), weights,
    total: Object.values(weights).reduce((a, b) => a + b, 0) }];
})) as Record<Setting, Prediction>;

export function prediction(mode: Mode, plan: Plan, setting: Setting): Prediction {
  if (mode === 'quantum') return quantum[setting];
  const answer = localOutcome(plan, setting);
  return { cloud: answer,
    weights: Object.fromEntries(OUTCOMES.map((o) => [o, Number(o === answer)])) as Record<Outcome, number>,
    total: 1 };
}
export function fraction(n: number, d: number): string {
  if (!d) return '—';
  if (!n) return '0';
  let a = Math.abs(n), b = Math.abs(d);
  while (b) [a, b] = [b, a % b];
  return d / a === 1 ? String(n / a) : `${n / a}/${d / a}`;
}

export interface Round {
  mode: Mode;
  setting: Setting;
  outcome: Outcome;
  kind: Kind;
  counted: boolean;
}
export function sampleRound(mode: Mode, plan: Plan, forced?: Setting, rng = Math.random): Round {
  // A plan/prepared state is already fixed before two independent fair coins.
  const setting = forced ?? `${rng() < 0.5 ? 'H' : 'T'}${rng() < 0.5 ? 'H' : 'T'}` as Setting;
  const p = prediction(mode, plan, setting);
  let remaining = Math.min(1 - Number.EPSILON, Math.max(0, rng())) * p.total;
  let outcome: Outcome = '00';
  for (const candidate of OUTCOMES) {
    if (p.weights[candidate] <= 0) continue;
    outcome = candidate;
    remaining -= p.weights[candidate];
    if (remaining < 0) break;
  }
  return { mode, setting, outcome, kind: classify(setting, outcome), counted: !forced };
}

export interface Stats {
  total: number;
  points: number;
  failures: number;
  rows: Record<Setting, Record<Outcome, number>>;
}
export function emptyStats(): Stats {
  return { total: 0, points: 0, failures: 0,
    rows: Object.fromEntries(SETTINGS.map((s) => [s, Object.fromEntries(OUTCOMES.map((o) => [o, 0]))])) as Stats['rows'] };
}
export function record(stats: Stats, round: Round): Stats {
  if (!round.counted) return stats;
  return { total: stats.total + 1,
    points: stats.points + Number(round.kind === 'point'),
    failures: stats.failures + Number(round.kind === 'failure'),
    rows: { ...stats.rows, [round.setting]: { ...stats.rows[round.setting],
      [round.outcome]: stats.rows[round.setting][round.outcome] + 1 } } };
}
export function rowTotal(stats: Stats, setting: Setting): number {
  return Object.values(stats.rows[setting]).reduce((a, b) => a + b, 0);
}
export function bellDifference(stats: Stats): number | null {
  if (SETTINGS.some((s) => rowTotal(stats, s) === 0)) return null;
  return SETTINGS.reduce((sum, s) => sum + (s === 'TT' ? 1 : -1) * stats.rows[s][EVENT[s]] / rowTotal(stats, s), 0);
}
export function expectedDifference(mode: Mode, plan: Plan): number {
  return SETTINGS.reduce((sum, s) => {
    const p = prediction(mode, plan, s);
    return sum + (s === 'TT' ? 1 : -1) * p.weights[EVENT[s]] / p.total;
  }, 0);
}
export const ALL_PLANS: Plan[] = Array.from({ length: 16 }, (_, i) =>
  i.toString(2).padStart(4, '0').split('').map(Number) as Plan);

/** Display the actual gates and both meters; only include the sampled result after readout. */
export function diagram(setting: Setting, phase: number, showState: boolean, outcome?: Outcome): string {
  const lines = ['shape os', `in ${SHARED_CLOUD}`, localGates(setting)];
  if (showState && phase >= 2) lines.push(`window ${quantum[setting].cloud}`);
  lines.push('measure 1 Z; measure 2 Z');
  if (phase >= 3 && outcome) lines.push(`out ${outcome}`);
  return lines.join('\n');
}
