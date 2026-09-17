// Run against the production build. Pass the path to an available jsdom module.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { JSDOM, VirtualConsole } = await import(pathToFileURL(process.argv[2]).href);
const virtualConsole = new VirtualConsole();
const errors = [];
virtualConsole.on('jsdomError', (error) => errors.push(error));
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost:5181', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
});
const w = dom.window;
let reduceMotion = true;
w.matchMedia = (query) => ({ matches: query.includes('reduced-motion') && reduceMotion, addEventListener() {} });
w.ResizeObserver = class { observe() {} disconnect() {} };
w.DOMPoint = class {
  constructor(x, y) { this.x = x; this.y = y; }
  matrixTransform() { return this; }
};
w.SVGElement.prototype.getScreenCTM = () => ({});
// There is no layout engine in jsdom; interaction and state tests use selectors.
const file = (await readdir('dist/assets')).find((name) => name.endsWith('.js'));
w.eval(await readFile(`dist/assets/${file}`, 'utf8'));
const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
const click = async (element) => { assert.ok(element); element.click(); await settle(); };
const button = (text) => [...w.document.querySelectorAll('button')].find((el) => el.textContent.trim() === text);
const text = () => w.document.body.textContent;
const inputQubit = (shape) => w.document.querySelector(`[data-input-qubit="${shape}"]`);
const setInput = async (shape, color) => {
  const qubit = inputQubit(shape);
  assert.ok(qubit, `missing initial ${shape} control`);
  if (!qubit.getAttribute('aria-label').startsWith(`Initial ${shape}: ${color}.`)) await click(qubit);
  assert.ok(inputQubit(shape).getAttribute('aria-label').startsWith(`Initial ${shape}: ${color}.`));
};
try {
  await settle();
  assert.equal(w.document.querySelectorAll('.mode-tab').length, 3);
  await click([...w.document.querySelectorAll('.mode-tab')].find((el) => el.textContent.includes('Quantum oracle')));
  assert.equal(w.document.querySelectorAll('.gate-slot').length, 4);
  assert.equal(w.document.querySelectorAll('.row-step').length, 5);
  assert.equal(w.document.querySelectorAll('.state-card').length, 0);
  assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '01');
  assert.equal(w.document.querySelectorAll('.initial-state').length, 1);
  assert.equal(w.document.querySelectorAll('.travelling-state').length, 0);
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(w.document.querySelectorAll('.state-card').length, 1);
  await click(w.document.querySelector('[data-h-slot="0"]'));
  await click(button('Step →'));
  assert.ok(w.document.querySelector('.state-card [role=img]').getAttribute('aria-label').includes('01|11'));
  assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '01|11', 'the moving qubits become a cloud before measurement');
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(w.document.querySelectorAll('.travelling-state, .state-card').length, 0, 'unchecked hides intermediate states on the circuit and beside it');
  assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '01');
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '01|11', 'showing the state does not reset the current step');
  // Jump explicitly to the measurement row.
  await click([...w.document.querySelectorAll('.row-step')].at(-1));
  assert.ok(text().includes('does not reliably distinguish'));
  assert.match(w.document.querySelector('.circuit-playback').dataset.state, /^[01]{2}$/, 'measurement leaves a definite pair on the wires');
  assert.match(w.document.querySelector('.measured-colors').textContent, /Square: (white|black) · Circle: (white|black)/);
  const firstMeasurement = w.document.querySelector('.measurement-result').textContent;
  await click(button('← Back'));
  await click(button('Measure →'));
  assert.equal(w.document.querySelector('.measurement-result').textContent, firstMeasurement, 'stepping back must not re-sample');

  await click(button('Place all four H gates'));
  assert.equal(w.document.querySelectorAll('.gate-slot.filled').length, 4);
  assert.ok(text().includes('Step 1 / 5'));
  assert.equal(w.document.querySelectorAll('.measurement-result').length, 0);
  // Exercise pointer drops from the palette, plus moving an existing gate.
  await click(button('Clear H gates'));
  const dragTo = async (source, target) => {
    w.document.elementFromPoint = () => target;
    source.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    w.dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true, clientX: 90, clientY: 90 }));
    await settle();
    assert.equal(w.document.querySelectorAll('.drag-ghost').length, 1);
    w.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true, clientX: 90, clientY: 90 }));
    await settle();
    assert.equal(w.document.querySelectorAll('.drag-ghost').length, 0);
  };
  await dragTo(w.document.querySelector('.h-tile'), w.document.querySelector('[data-h-slot="1"]'));
  assert.ok(w.document.querySelector('[data-h-slot="1"]').classList.contains('filled'));
  await dragTo(w.document.querySelector('[data-h-slot="1"]'), w.document.querySelector('[data-h-slot="3"]'));
  assert.ok(!w.document.querySelector('[data-h-slot="1"]').classList.contains('filled'));
  assert.ok(w.document.querySelector('[data-h-slot="3"]').classList.contains('filled'));
  await click(button('Place all four H gates'));
  for (const [setup, expected] of [['Both money', 'Both doors are safe'], ['White door', 'A tiger is present'], ['Black door', 'A tiger is present']]) {
    await click([...w.document.querySelectorAll('.case-btn')].find((el) => el.textContent.trim() === setup));
    await click([...w.document.querySelectorAll('.row-step')].at(-1));
    assert.ok(w.document.querySelector('.measurement-result').textContent.includes(expected));
  }
  await click([...w.document.querySelectorAll('.case-btn')].find((el) => el.textContent.trim() === 'White door'));
  await click(button('Inside'));
  assert.equal(w.document.querySelectorAll('.row-step').length, 7);
  assert.ok(!w.document.querySelector('.circuit-column').textContent.includes('Tiger?'));
  await click(button('Oracle'));
  assert.equal(w.document.querySelectorAll('.row-step').length, 5);
  assert.ok(w.document.querySelector('.circuit-column').textContent.includes('Tiger?'));
  // Exercise actual in-flight motion and pause/resume as well as instant steps.
  reduceMotion = false;
  await click(button('Run circuit'));
  await new Promise((resolve) => setTimeout(resolve, 880));
  const movingSvg = w.document.querySelector('.circuit-playback');
  assert.equal(movingSvg.dataset.moving, 'true');
  assert.equal(w.document.querySelectorAll('.measurement-result').length, 0);
  const movingTransform = () => w.document.querySelector('.travelling-state > g').getAttribute('transform');
  await click(button('Pause'));
  const stopped = movingTransform();
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(movingTransform(), stopped, 'pause must stop the qubits, not only the step timer');
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(w.document.querySelectorAll('.travelling-state').length, 0, 'unchecked also hides an in-flight state');
  assert.equal(w.document.querySelectorAll('.initial-state').length, 1);
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(movingTransform(), stopped, 'toggling visibility does not restart a paused animation');
  await click(button('Resume'));
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.notEqual(movingTransform(), stopped);
  await click(button('Pause'));
  reduceMotion = true;
  await click(button('New round'));
  assert.ok(text().includes('Step 1 / 5'));
  assert.equal(w.document.querySelectorAll('.measurement-result').length, 0);
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(w.document.querySelectorAll('.state-card').length, 0);
  await click([...w.document.querySelectorAll('.row-step')].at(-1));
  assert.equal(w.document.querySelectorAll('.measurement-result').length, 1);
  assert.equal(w.document.querySelector('.circuit-playback').dataset.moving, 'false');
  assert.equal(w.document.querySelectorAll('.initial-state').length, 1);
  assert.equal(w.document.querySelectorAll('.travelling-state').length, 1, 'unchecked still shows the completed measured output');
  const completedResult = w.document.querySelector('.measurement-result').textContent;
  await click(w.document.querySelector('input[type=checkbox]'));
  await click(w.document.querySelector('input[type=checkbox]'));
  assert.equal(w.document.querySelector('.measurement-result').textContent, completedResult, 'toggling visibility must not re-sample the measured result');
  assert.match(w.document.querySelector('[aria-label^="Measured pair."]').getAttribute('aria-label'), /Square:.*Circle:/);

  // A fresh run samples again even when only the circle is uncertain. Results
  // disappear during replay and agree with the final pair on the circuit.
  await click([...w.document.querySelectorAll('.case-btn')].find((el) => el.textContent.trim() === 'Both money'));
  await click(button('Clear H gates'));
  await click(w.document.querySelector('[data-h-slot="3"]'));
  w.Math.random = () => 0;
  await click([...w.document.querySelectorAll('.row-step')].at(-1));
  assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '00');
  assert.ok(text().includes('randomly sampled'));
  w.Math.random = () => 0.999;
  await click(button('Run again'));
  assert.equal(w.document.querySelectorAll('.measurement-result').length, 0);
  await new Promise((resolve) => setTimeout(resolve, 2950));
  assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '01');
  assert.match(w.document.querySelector('.measured-colors').textContent, /Square: white · Circle: black/);

  await click([...w.document.querySelectorAll('.mode-tab')].find((el) => el.textContent.includes('One query')));
  await click(button('Query oracle'));
  await new Promise((resolve) => setTimeout(resolve, 1550));
  assert.equal(button('Query oracle').disabled, true);
  assert.ok(w.document.querySelector('.readout').textContent.includes('selected door'));
  await click(button('Retry same doors'));
  assert.equal(button('Query oracle').disabled, false);

  // Both input qubits are directly clickable in each classical pane/view.
  // Starting the circle black must NOT reverse the interpretation of a tiger.
  for (const mode of ['Explore', 'One query']) for (const view of ['Oracle', 'Inside']) {
    await click([...w.document.querySelectorAll('.mode-tab')].find((el) => el.querySelector('strong').textContent === mode));
    await click(button(view));
    await click([...w.document.querySelectorAll('.case-btn')].find((el) => el.textContent.trim() === 'White door'));
    assert.equal(w.document.querySelectorAll('[data-input-qubit]').length, 2);
    await setInput('square', 'black');
    assert.equal(w.document.querySelector('.door-choice.active').textContent.trim(), 'Black door');
    await setInput('square', 'white');
    await setInput('circle', 'white');
    await setInput('circle', 'black');
    await click(button('Query oracle'));
    assert.equal(w.document.querySelectorAll('[data-input-qubit]').length, 0, 'travelling/output qubits are not input controls');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.ok(w.document.querySelector('.readout').textContent.includes('Circle flipped to white:'));
    assert.ok(w.document.querySelector('.readout').textContent.includes('a tiger'));
    assert.equal(button('Query oracle').disabled, mode === 'One query');
    await click(button(mode === 'One query' ? 'Retry same doors' : 'Clear queries'));
    assert.equal(w.document.querySelectorAll('[data-input-qubit]').length, 2);
    await setInput('square', 'black');
    await click(button('Query oracle'));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.ok(w.document.querySelector('.readout').textContent.includes('Circle stayed black:'));
    assert.ok(w.document.querySelector('.readout').textContent.includes('money'));
  }

  await click([...w.document.querySelectorAll('.mode-tab')].find((el) => el.textContent.includes('Quantum oracle')));
  await click(button('Place all four H gates'));
  for (const view of ['Oracle', 'Inside']) {
    await click(button(view));
    await setInput('square', 'black');
    await setInput('circle', 'black');
    assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '11');
    for (const [setup, expected, square] of [['Both money', 'Both doors are safe', 'black'], ['White door', 'A tiger is present', 'white'], ['Black door', 'A tiger is present', 'white']]) {
      await click([...w.document.querySelectorAll('.case-btn')].find((el) => el.textContent.trim() === setup));
      await click([...w.document.querySelectorAll('.row-step')].at(-1));
      assert.ok(w.document.querySelector('.measurement-result').textContent.includes(expected));
      assert.ok(w.document.querySelector('.measured-colors').textContent.includes(`Square: ${square}`));
    }
    await setInput('circle', 'white');
    assert.equal(w.document.querySelectorAll('.measurement-result').length, 0, 'changing an input clears stale measurements');
    assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '10');
    assert.ok(text().includes('Step 1 /'));
    await click([...w.document.querySelectorAll('.row-step')].at(-1));
    assert.ok(w.document.querySelector('.measurement-result').textContent.includes('does not reliably distinguish'));
    await setInput('square', 'white');
    await setInput('circle', 'black');
    await click(w.document.querySelector('input[type=checkbox]'));
    assert.equal(w.document.querySelectorAll('[data-input-qubit]').length, 2, 'inputs are clickable with state display enabled too');
    await setInput('square', 'black');
    assert.ok(w.document.querySelector('.state-card [role=img]').getAttribute('aria-label').includes('11'));
    await click(button('Step →'));
    assert.equal(w.document.querySelectorAll('[data-input-qubit]').length, 0, 'a travelling state is never an input toggle');
    await click(w.document.querySelector('input[type=checkbox]'));
    await setInput('square', 'white');
    assert.equal(w.document.querySelector('.circuit-playback').dataset.state, '01');
  }
  assert.equal(errors.length, 0, errors.map(String).join('\n'));
  console.log('Passed DOM checks: clickable inputs in every mode/view, input-dependent results, state visibility, gate editing, moving states, pause/resume, joint measurement, fresh replay sampling, view changes, resets, and one-query limit.');
} finally { dom.window.close(); }
