import { describe, it, expect } from 'vitest';
import { ALL_PLANS, SETTINGS, OUTCOMES, EVENT, classify, prediction, sampleRound,
  localOutcome, emptyStats, record, rowTotal, bellDifference, expectedDifference,
  fraction, diagram, type Plan, type Setting } from '../src/lib/bell';

const plan: Plan = [0, 1, 0, 1];
function seeded(seed = 12345) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
describe('the PS5 quantum circuit', () => {
  const expected = { HH: [1/3, 1/3, 1/3, 0], HT: [2/3, 0, 1/6, 1/6],
    TH: [2/3, 1/6, 0, 1/6], TT: [3/4, 1/12, 1/12, 1/12] };
  for (const s of SETTINGS) it(`computes every probability for ${s} from the circuit`, () => {
    const p = prediction('quantum', plan, s);
    expect(OUTCOMES.map(o => p.weights[o] / p.total)).toEqual(expected[s]);
    expect(Object.values(p.weights).reduce((a,b) => a+b)).toBe(p.total);
  });
  it('keeps counts and the relative minus in the displayed cloud', () => {
    expect(prediction('quantum', plan, 'TT').cloud).toBe('00|00|00|01|10|-11');
    expect(prediction('quantum', plan, 'HT').cloud).toBe('00|00|10|11');
  });
  it('has no signalling in either player’s marginal', () => {
    for (const person of [0, 1]) for (const own of ['H','T']) {
      const totals = ['H','T'].map(other => {
        const s = (person === 0 ? own+other : other+own) as Setting;
        const p = prediction('quantum', plan, s);
        return OUTCOMES.filter(o => o[person] === '1').reduce((a,o) => a+p.weights[o]/p.total,0);
      });
      expect(totals[0]).toBeCloseTo(totals[1], 14);
    }
  });
  it('shows one meter per qubit and reveals only the sampled pair', () => {
    const src = diagram('TT', 3, false, '11');
    expect(src).toContain('measure 1 Z; measure 2 Z');
    expect(src).toContain('out 11');
    expect(src).not.toContain('window');
    expect(diagram('TT', 2, true)).toContain('window 00|00|00|01|10|-11');
    expect(diagram('TT', 2, true)).not.toContain('out ');
  });
});
describe('local plans and the Bell bound', () => {
  it('checks every local plan, not just a selected classical strategy', () => {
    expect(ALL_PLANS).toHaveLength(16);
    for (const p of ALL_PLANS) {
      expect(expectedDifference('local', p)).toBeLessThanOrEqual(0);
      if (classify('TT', localOutcome(p,'TT')) === 'point') {
        expect(SETTINGS.some(s => classify(s,localOutcome(p,s)) === 'failure')).toBe(true);
      }
    }
    expect(expectedDifference('quantum', plan)).toBe(1/12);
  });
  it('a player’s answer never depends on the remote setting', () => {
    for (const p of ALL_PLANS) {
      expect(localOutcome(p,'HH')[0]).toBe(localOutcome(p,'HT')[0]);
      expect(localOutcome(p,'TH')[0]).toBe(localOutcome(p,'TT')[0]);
      expect(localOutcome(p,'HH')[1]).toBe(localOutcome(p,'TH')[1]);
      expect(localOutcome(p,'HT')[1]).toBe(localOutcome(p,'TT')[1]);
    }
  });
  it('labels all sixteen event combinations correctly', () => {
    for (const s of SETTINGS) for (const o of OUTCOMES)
      expect(classify(s,o)).toBe(o === EVENT[s] ? s === 'TT' ? 'point' : 'failure' : 'allowed');
  });
});
describe('sampling and bookkeeping', () => {
  it('never samples an impossible result, even at RNG boundaries', () => {
    for (const s of SETTINGS) for (const r of [0, Number.EPSILON, .2, .5, .8, 1-Number.EPSILON, 1]) {
      const round = sampleRound('quantum', plan, s, () => r);
      expect(prediction('quantum', plan,s).weights[round.outcome]).toBeGreaterThan(0);
    }
  });
  it('uses two separate coin draws', () => {
    const draws = [.2,.8,.5];
    expect(sampleRound('quantum', plan, undefined, () => draws.shift()!).setting).toBe('HT');
    expect(draws).toHaveLength(0);
  });
  it('does not mix guided fixed-setting trials into the randomized evidence', () => {
    const stats = emptyStats();
    expect(record(stats, sampleRound('quantum', plan, 'TT', () => .99))).toBe(stats);
    expect(stats.total).toBe(0);
    expect(bellDifference(stats)).toBeNull();
  });
  it('converges to the probabilities across fresh independent rounds', () => {
    let stats = emptyStats(); const rng = seeded();
    for (let i=0; i<48000; i++) stats=record(stats,sampleRound('quantum',plan,undefined,rng));
    expect(stats.total).toBe(48000); expect(stats.failures).toBe(0);
    // Compare with sampling uncertainty, rather than arbitrary decimal rounding.
    const withinSamplingError = (count: number, total: number, probability: number) => {
      const standardError = Math.sqrt(probability * (1 - probability) / total);
      expect(Math.abs(count / total - probability)).toBeLessThanOrEqual(5 * standardError + 1 / total);
    };
    withinSamplingError(stats.points, stats.total, 1/48);
    for (const s of SETTINGS) {
      withinSamplingError(rowTotal(stats,s), stats.total, .25);
      const p=prediction('quantum',plan,s);
      for (const o of OUTCOMES) withinSamplingError(stats.rows[s][o], rowTotal(stats,s), p.weights[o]/p.total);
    }
    expect(bellDifference(stats)).toBe(stats.rows.TT['11'] / rowTotal(stats, 'TT'));
  });
  it('does not mutate earlier statistics and handles empty row fractions', () => {
    const before=emptyStats(); const after=record(before,sampleRound('local',plan,undefined,()=>.8));
    expect(before.total).toBe(0); expect(after.total).toBe(1); expect(after.points).toBe(1);
    expect(fraction(1,12)).toBe('1/12'); expect(fraction(0,3)).toBe('0'); expect(fraction(1,0)).toBe('—');
  });
});
