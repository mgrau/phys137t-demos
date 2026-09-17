import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const q = await server.ssrLoadModule('/src/lib/quantum.ts');
  const g = await server.ssrLoadModule('/src/lib/game.ts');
  const k = await server.ssrLoadModule('misty-states/kernel');
  const { render } = await server.ssrLoadModule('misty-states/render');
  const norm = (source) => k.canonical(k.simulate(k.parseCircuit(`in ${source}`), 0));
  const branches = (list) => list.map(({ square, circle, probability, state }) => [square, circle, probability, norm(state)]);
  let checked = 0;
  for (const input of ['00', '01', '10', '11']) for (let mask = 0; mask < 16; mask++) {
    const gates = Array.from({ length: 4 }, (_, i) => Boolean(mask & (1 << i)));
    for (const where of ['none', 'white', 'black']) {
      const sealed = q.quantumExperiment(where, gates, 'oracle', input);
      const inside = q.quantumExperiment(where, gates, 'inside', input);
      assert.equal(sealed.steps[0].state, input);
      assert.ok(sealed.circuit.includes(`in ${input}\n`));
      assert.deepEqual(branches(sealed.outcomes), branches(inside.outcomes), `${where}/${mask}: views disagree`);
      assert.deepEqual(norm(sealed.steps[2].state), norm(inside.steps.at(-3).state));
      assert.equal(sealed.outcomes.reduce((sum, branch) => sum + branch.probability, 0), 1);

      // Cross-check against one independently parsed, complete implementation.
      const row = (a, b) => `${a ? 'H' : 'I'} 1; ${b ? 'H' : 'I'} 2`;
      const source = `in ${input}\n${row(gates[0], gates[1])}\n${g.oracle(where)}\n${row(gates[2], gates[3])}\nmeasure 1 Z; measure 2 Z`;
      const reference = k.simulateBranches(k.parseCircuit(source), 99).branches;
      assert.deepEqual(sealed.outcomes.map((out) => out.probability), reference.map((out) => out.odds.n / out.odds.d));
      for (let i = 0; i < reference.length; i++) assert.deepEqual(norm(sealed.outcomes[i].state), k.canonical(reference[i].amps));

      for (const experiment of [sealed, inside]) {
        const doc = k.parseCircuit(experiment.circuit);
        assert.equal(doc.layers.length, experiment.steps.length - 1, 'steps must align with visible rows');
        assert.deepEqual(doc.layers.at(-1).gates.filter((gate) => gate.kind === 'measure').map((gate) => gate.qubit), [1, 2], 'each wire must end in its own measurement');
        const result = render(experiment.circuit, { background: false, check: false });
        assert.ok(result.svg.includes('<svg'));
        assert.equal(result.geometry.layers.length, experiment.steps.length - 1);
        for (const step of experiment.steps) assert.ok(render(step.state, { background: false }).svg.includes('<svg'));
      }
      for (const r of [0, 0.499, 0.501, 0.999]) {
        const outcome = q.sampleMeasurement(sealed.outcomes, r);
        const terms = norm(outcome.state);
        assert.equal(terms.length, 1, 'both measurements must leave one basis-state pair');
        assert.equal(terms[0][0], outcome.square + outcome.circle);
      }
      checked++;
    }
    assert.equal(q.distinguishesCases(gates, input), input[1] === '1' && gates[0] && gates[1] && gates[2], 'a black input circle is required; the input square color and final circle H are optional');
    for (const wire of [0, 1]) {
      const toggled = q.toggleInput(input, wire);
      assert.notEqual(toggled[wire], input[wire]);
      assert.equal(toggled[1 - wire], input[1 - wire]);
      assert.equal(q.toggleInput(toggled, wire), input);
    }
  }
  for (const where of ['none', 'white', 'black']) for (const square of ['0', '1']) for (const circle of ['0', '1']) {
    const input = k.simulate(k.parseCircuit(`in ${square}${circle}`), 0);
    const output = q.applyOracle(where, input);
    assert.deepEqual(k.canonical(output), k.canonical(k.simulate(k.parseCircuit(`in ${square}${circle}\n${g.oracle(where)}`), 99)));
  }
  const random = q.quantumExperiment('white', [true, false, false, false], 'oracle').outcomes;
  assert.equal(random.length, 2);
  assert.equal(q.sampleMeasurement(random, 0).square, '0');
  assert.equal(q.sampleMeasurement(random, 0.999).square, '1');
  assert.deepEqual(random.map((out) => out.square + out.circle), ['00', '11'], 'white tiger preserves correlated outcomes');
  const anticorrelated = q.quantumExperiment('black', [true, false, false, false], 'oracle').outcomes;
  assert.deepEqual(anticorrelated.map((out) => out.square + out.circle), ['01', '10']);
  const uniform = q.quantumExperiment('none', [true, true, false, false], 'oracle').outcomes;
  assert.deepEqual(uniform.map((out) => out.probability), [0.25, 0.25, 0.25, 0.25]);
  assert.deepEqual([0.125, 0.375, 0.625, 0.875].map((r) => {
    const out = q.sampleMeasurement(uniform, r);
    return out.square + out.circle;
  }), ['00', '01', '10', '11']);
  const optionalCircleH = q.quantumExperiment('none', [true, true, true, false], 'oracle').outcomes;
  assert.deepEqual(optionalCircleH.map((out) => [out.square, out.circle, out.probability]), [['0', '0', 0.5], ['0', '1', 0.5]]);
  console.log(`Passed ${checked} circuit/setup combinations in both views, both detectors, all 12 basis inputs, joint probabilities, correlation, complete collapse, and incomplete-circuit verdicts.`);
} finally {
  await server.close();
}
