import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render } from 'misty-states/render';
import { loadBank, parseQuestion } from '../src/lib/questions';
import { diagramOf, emptyAnswer, expected, finalStep, grade, numeric, readState, sameState, stateSource, validatePhysics } from '../src/lib/engine';
import { freshProgress, loadProgress, recordCheck, shuffled } from '../src/lib/session';

const dir = fileURLToPath(new URL('../questions/', import.meta.url));
const files = Object.fromEntries(readdirSync(dir, { recursive: true }).filter((f): f is string => typeof f === 'string' && f.endsWith('.md')).map(f => [f, readFileSync(`${dir}/${f}`, 'utf8')]));
const bank = loadBank(files);
const q = (id: string) => bank.find(q => q.id === id)!;
const answer = (text: string) => ({ ...emptyAnswer(), text });

describe('authored bank', () => {
  it('covers five weeks and all six answer types', () => {
    expect(bank.length).toBeGreaterThanOrEqual(35);
    for (let week = 1; week <= 5; week++) expect(bank.filter(q => q.week === week).length).toBeGreaterThanOrEqual(7);
    expect(new Set(bank.map(q => q.kind)).size).toBe(6);
  });
  for (const question of bank) it(`${question.id}: computable answers and renderable question/solution`, () => {
    validatePhysics(question);
    if (diagramOf(question)) expect(render(diagramOf(question), { check: false }).svg).toContain('<svg');
    for (const option of question.options ?? []) {
      if (typeof option !== 'string') expect(render(`shape ${question.shapes}\n${option.state}`, { check: false }).svg).toContain('<svg');
    }
    for (const step of [...question.steps, finalStep(question)]) {
      for (const match of step.matchAll(/```misty\s*\n([\s\S]*?)```/g)) expect(render(`shape ${question.shapes}\n${match[1]}`).svg).toContain('<svg');
      for (const match of step.matchAll(/`misty:\s*([^`]+)`/g)) expect(render(`shape ${question.shapes}\n${match[1]}`).svg).toContain('<svg');
    }
  });
  it('rejects typos, duplicate IDs, ambiguous unquoted bit patterns and impossible givens', () => {
    const raw = files['04-conditional-black.md'];
    expect(() => parseQuestion(raw.replace('week: 4', 'week: 8'), 'bad.md')).toThrow('week');
    expect(() => parseQuestion(raw.replace('qubits: 2', 'qubit: 2'), 'bad.md')).toThrow('Unknown field');
    expect(() => parseQuestion(raw.replace('given: "?1"', 'given: 01'), 'bad.md')).toThrow('must be text');
    expect(() => loadBank({ a: raw, b: raw })).toThrow('Duplicate');
    expect(() => expected({ ...q('conditional-black'), circuit: 'in 00' })).toThrow('impossible');
  });
});

describe('independent worked examples', () => {
  it.each([
    ['weighted', [16/17,1/17]], ['negative', [9/10,1/10]], ['cancel', [4/5,1/5]],
    ['joint', [9/10,1/10,0]], ['partial', [2/3,1/3]], ['h-weighted', [1/10,9/10]],
    ['bell-probabilities', [3/4,1/12,1/12,1/12]], ['bell-failure', [0]],
  ])('%s agrees with the hand calculation', (id, values) => {
    expected(q(id as string)).values!.forEach((v,i) => expect(v).toBeCloseTo((values as number[])[i], 12));
  });
  it.each([
    ['classical-output','100'], ['h-white','0|1'], ['h-black','0|-1'], ['double-h','1'],
    ['conditional-white','00'], ['conditional-black','(0|-1)1'],
  ])('%s has the correct output state', (id, text) => expect(grade(q(id), answer(text)).status).toBe('correct'));
  it('uses all complete input patterns for truth tables', () => {
    expect(expected(q('cnot-table')).values).toEqual([0,3,2,1]);
    expect(expected(q('circuit-table')).values).toEqual([1,3,2,0]);
  });
});

describe('grading physical meaning', () => {
  it('diagram choices preserve the product signs and remain gradable', () => {
    const product = q('product');
    const target = readState(product.diagram!, product.qubits);
    product.options!.forEach((option, i) => {
      if (typeof option === 'string') throw new Error('Product choices should be drawn states.');
      const correct = sameState(readState(option.state, product.qubits), target);
      expect(correct).toBe(product.answer!.includes(i + 1));
      expect(grade(product, { ...emptyAnswer(), selected: [i + 1] }).status).toBe(correct ? 'correct' : 'incorrect');
    });
    expect(() => parseQuestion(files['02-product.md'].replace(/    label: .*\n/g, ''), 'unlabelled.md')).toThrow('label');
    expect(() => validatePhysics({ ...product, options: [{ state: '0', label: 'Incomplete register' }] })).toThrow('2 qubits');
  });
  it('accepts reordering, factoring, global sign and common scale', () => {
    const question = q('conditional-black');
    for (const text of ['01|-11', '-11|01', '(0|-1)1', '-01|11', '2*01|-2*11']) expect(grade(question, answer(text)).status).toBe('correct');
    expect(grade(question, answer('01|11')).status).toBe('incorrect');
  });
  it('does not pad an incomplete register, ignore extra rows, or accept a zero state', () => {
    for (const text of ['0', '0|01', '00\n11', '00|-00', '?0', '00=00', '00 # hidden', '0@2']) expect(grade(q('conditional-white'), answer(text)).status).toBe('incomplete');
    expect(grade(q('conditional-white'), answer('01')).status).toBe('incorrect');
  });
  it('accepts different valid preparation circuits, but keeps the input fixed', () => {
    expect(grade(q('bell-prepare'), answer('H 2\nCNOT 2 1')).status).toBe('correct');
    expect(grade(q('bell-prepare'), answer('H 1\nH 2')).status).toBe('incorrect');
    for (const text of ['in 00|11', 'H 3', 'CNOT 1 1', 'measure 1 Z', 'H 1\nout 00|11']) expect(grade(q('bell-prepare'), answer(text)).status).toBe('incomplete');
  });
  it('preserves unequal amplitudes when serializing states', () => {
    const amps = readState('3*00|01|10|-11', 2);
    expect(sameState(amps, readState(stateSource(amps),2))).toBe(true);
  });
  it('handles numerical formats without executing expressions', () => {
    for (const text of ['0.5','1/2','50%','5e-1']) expect(numeric(text)).toBe(.5);
    for (const text of ['','1/0','Infinity','0.5abc','2**3','alert(1)']) expect(numeric(text)).toBeNull();
    expect(grade(q('negative'), { ...emptyAnswer(), values: ['90%', '1/10'] }).status).toBe('correct');
    expect(grade(q('negative'), { ...emptyAnswer(), values: ['90', '10'] }).status).toBe('incomplete');
    expect(grade(q('negative'), { ...emptyAnswer(), values: ['3/4', '1/4'] }).status).toBe('incorrect');
    expect(grade(q('negative'), { ...emptyAnswer(), values: ['0.896', '0.096'] }).message).toContain('add to 1');
  });
  it('requires all correct choices and no extra selections', () => {
    expect(grade(q('bell-meaning'), { ...emptyAnswer(), selected: [2,1] }).status).toBe('correct');
    expect(grade(q('bell-meaning'), { ...emptyAnswer(), selected: [1] }).status).toBe('incorrect');
    expect(grade(q('bell-meaning'), { ...emptyAnswer(), selected: [1,2,3] }).status).toBe('incorrect');
  });
});

describe('retry and progress rules', () => {
  it('counts distinct wrong answers; ignores incomplete and duplicate checks', () => {
    let progress = freshProgress();
    progress = recordCheck(progress, '', { status: 'incomplete', message: '' });
    for (const value of ['a','a','b','c']) progress = recordCheck(progress, value, { status: 'incorrect', message: '' });
    expect(progress.wrong).toHaveLength(3);
    expect(progress.solved).toBe(false);
  });
  it('keeps work done with a solution separate from independent solutions', () => {
    const helped = recordCheck({ ...freshProgress(), revealed: true }, 'x', { status: 'correct', message: '' });
    expect(helped.solved).toBe(true); expect(helped.independent).toBe(false);
    expect(recordCheck(freshProgress(), 'x', { status: 'correct', message: '' }).independent).toBe(true);
  });
  it('deals a whole shuffled bank without duplicates', () => {
    const deck = shuffled(bank.map(q => q.id));
    expect(new Set(deck).size).toBe(bank.length);
    expect([...deck].sort()).toEqual(bank.map(q => q.id).sort());
  });
  it('tolerates blocked and corrupt browser storage', () => {
    expect(loadProgress({ getItem: () => { throw new Error('denied'); } })).toEqual({});
    expect(loadProgress({ getItem: () => '{bad' })).toEqual({});
    expect(loadProgress({ getItem: () => '{"x":{"wrong":3}}' })).toEqual({});
  });
});
