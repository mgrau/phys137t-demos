<script lang="ts">
  import { onDestroy } from 'svelte';
  import Figure from './Figure.svelte';
  import CircuitPlayback from './CircuitPlayback.svelte';
  import InputQubitToggle from './InputQubitToggle.svelte';
  import type { Where } from './game';
  import { quantumExperiment, distinguishesCases, sampleMeasurement, toggleInput, type Hadamards, type InitialState, type Measurement, type OracleView } from './quantum';

  let { where, view, round, gates = $bindable(), input = $bindable('01') }: {
    where: Where;
    view: OracleView;
    round: number;
    gates: Hadamards;
    input: InitialState;
  } = $props();

  const SLOTS = ['Square before the oracle', 'Circle before the oracle', 'Square after the oracle', 'Circle after the oracle'];
  let showStates = $state(false);
  let at = $state(0);
  let playing = $state(false);
  let paused = $state(false);
  let moving = $state(false);
  let cursor = $state(0);
  let run = $state(0);
  let measured = $state<Measurement | null>(null);
  const experiment = $derived(quantumExperiment(where, gates, view, input));
  const solves = $derived(distinguishesCases(gates, input));
  const last = $derived(experiment.steps.length - 1);
  const displayAt = $derived(Math.min(last, Math.round(cursor)));
  const step = $derived(experiment.steps[displayAt]);
  const measuredNow = $derived(cursor === last && !moving && measured !== null);
  const shownState = $derived(displayAt === last && measured ? measured.state : step.state);
  const resetKey = $derived(`${where}-${view}-${round}-${input}-${gates.join('')}-${run}`);
  const colors = (result: Measurement) => `Square: ${result.square === '0' ? 'white' : 'black'} · Circle: ${result.circle === '0' ? 'white' : 'black'}`;

  // A changed circuit or new round starts a new experiment. Merely hiding the
  // state explanation does not restart playback or re-sample a measurement.
  $effect(() => {
    void where; void view; void round; void input; void gates.join('');
    at = 0;
    playing = false;
    paused = false;
    measured = null;
  });

  $effect(() => {
    if (!playing || moving) return;
    if (at >= last) { playing = false; return; }
    const timer = setTimeout(() => advance(at + 1), 700);
    return () => clearTimeout(timer);
  });

  function advance(next: number) {
    at = Math.max(0, Math.min(last, next));
    if (at === last && !measured) measured = sampleMeasurement(experiment.outcomes);
  }

  function goTo(next: number) { playing = false; paused = false; advance(next); }

  function play() {
    if (playing) { playing = false; paused = true; return; }
    if (at === last && !moving) { at = 0; measured = null; run += 1; }
    paused = false;
    playing = true;
  }

  let circuitFig = $state<ReturnType<typeof CircuitPlayback> | null>(null);
  let board: HTMLDivElement;
  let zones = $state<Array<{ x: number; y: number } | null>>([]);
  let inputs = $state<Array<{ x: number; y: number } | null>>([]);
  let rows = $state<number[]>([]);
  const activeY = $derived.by(() => {
    const index = Math.min(last, Math.floor(cursor));
    const fraction = cursor - index;
    const eased = fraction * fraction * (3 - 2 * fraction);
    const start = rows[index] ?? 45;
    return start + ((rows[index + 1] ?? start) - start) * eased;
  });

  function measureLayout() {
    if (!circuitFig || !board) return;
    const frame = board.getBoundingClientRect();
    inputs = [0, 1].map((wire) => {
      const point = circuitFig!.inputPoint(wire);
      return point ? { x: point.x - frame.left, y: point.y - frame.top } : null;
    });
    const after = experiment.oracleLayers + 1;
    zones = [[0, 0], [0, 1], [after, 0], [after, 1]].map(([layer, wire]) => {
      const point = circuitFig!.gatePoint(layer, wire);
      return point ? { x: point.x - frame.left, y: point.y - frame.top } : null;
    });
    rows = experiment.steps.map(({ layer }) => {
      const point = circuitFig!.statePoint(layer);
      return point ? point.y - frame.top : 45;
    });
  }

  $effect(() => {
    void experiment.circuit; void showStates;
    if (!circuitFig || !board) return;
    const observer = new ResizeObserver(measureLayout);
    observer.observe(board);
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(measureLayout); });
    return () => { observer.disconnect(); cancelAnimationFrame(first); cancelAnimationFrame(second); };
  });

  let drag = $state<{ x: number; y: number; startX: number; startY: number; from: number | null } | null>(null);
  let over = $state<number | null>(null);
  let dragged = $state(false);

  function slotAt(x: number, y: number): number | null {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-h-slot]');
    return element && board?.contains(element) ? Number(element.dataset.hSlot) : null;
  }

  function beginDrag(event: PointerEvent, from: number | null = null) {
    if (event.button !== 0) return;
    dragged = false;
    drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, from };
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('keydown', cancelOnEscape);
  }

  function moveDrag(event: PointerEvent) {
    if (!drag) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5) dragged = true;
    over = dragged ? slotAt(drag.x, drag.y) : null;
  }

  function endDrag(event: PointerEvent) {
    if (dragged && drag) {
      const target = slotAt(event.clientX, event.clientY);
      if (target !== null) {
        const next = [...gates] as Hadamards;
        if (drag.from !== null) next[drag.from] = false;
        next[target] = true;
        gates = next;
      }
    }
    cancelDrag();
    // Consume the synthetic click after a drop, but never swallow a later click.
    setTimeout(() => (dragged = false), 0);
  }

  function cancelDrag() {
    drag = null; over = null;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
    window.removeEventListener('keydown', cancelOnEscape);
  }

  function cancelOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') cancelDrag(); }
  onDestroy(cancelDrag);

  function toggleSlot(index: number) {
    if (dragged) { dragged = false; return; }
    const next = [...gates] as Hadamards;
    next[index] = !next[index];
    gates = next;
  }

  function addNext() {
    if (dragged) { dragged = false; return; }
    const next = gates.findIndex((gate) => !gate);
    if (next >= 0) toggleSlot(next);
  }
</script>

<div class="quantum-oracle">
  <div class="quantum-tools">
    <button class="h-tile" onpointerdown={(e) => beginDrag(e)} onclick={addNext}
      aria-label="Hadamard gate. Drag to a slot, or click to add.">H</button>
    <p><strong>Add Hadamards</strong><span>Drag H to a slot, or click a slot. Click an H to remove it.</span></p>
    <button class="quiet-btn" disabled={!gates.some(Boolean)} onclick={() => (gates = [false, false, false, false])}>Clear H gates</button>
  </div>
  <div class="quantum-options">
    <label><input type="checkbox" bind:checked={showStates} /> Show quantum state</label>
    <details class="circuit-hint">
      <summary>Need a starting point?</summary>
      <p>Start with a white square and a black circle. Try an H on each qubit before and after the oracle. Then change one input or gate and compare.</p>
      <button class="quiet-btn" onclick={() => (gates = [true, true, true, true])}>Place all four H gates</button>
    </details>
  </div>
  <p class="input-hint">Click either initial qubit to switch white ↔ black and restart the circuit.</p>

  <div class="circuit-board" class:with-states={showStates} bind:this={board}>
    <div class="circuit-column">
      <div class="wire-labels"><span>Square</span><span>Circle</span></div>
      <CircuitPlayback bind:this={circuitFig} source={experiment.circuit} steps={experiment.steps}
        target={at} result={measured} {paused} {resetKey} {showStates} bind:cursor bind:moving />
      <span class="measurement-label">Measure both colors</span>
    </div>

    {#if !showStates || (cursor === 0 && !moving)}
      {#each inputs as point, wire}
        {#if point}
          <InputQubitToggle shape={wire === 0 ? 'square' : 'circle'} value={input[wire]}
            x={point.x} y={point.y} onToggle={() => (input = toggleInput(input, wire))} />
        {/if}
      {/each}
    {/if}

    {#each SLOTS as label, index}
      {@const zone = zones[index]}
      {#if zone}
        <button class="gate-slot" class:filled={gates[index]} class:over={over === index} class:in-flight={moving}
          style:left={`${zone.x}px`} style:top={`${zone.y}px`} data-h-slot={index}
          aria-label={`${label}: ${gates[index] ? 'Hadamard placed. Click to remove or drag to move.' : 'empty. Click to add Hadamard.'}`}
          onpointerdown={(e) => { if (gates[index]) beginDrag(e, index); }}
          onclick={() => toggleSlot(index)}>{gates[index] ? '' : '+ H'}</button>
      {/if}
    {/each}

    {#each experiment.steps as checkpoint, index}
      {#if rows[index] !== undefined}
        <button class="row-step" class:current={index === displayAt} class:past={index < displayAt} disabled={moving}
          style:top={`${rows[index]}px`} onclick={() => goTo(index)}
          aria-label={`Step ${index + 1}: ${checkpoint.title}`}
          aria-current={index === displayAt ? 'step' : undefined}>{index + 1}</button>
      {/if}
    {/each}

    {#if showStates}
      <div class="state-lane">
        <span class="lane-label">State after this step</span>
        <div class="state-card" style:top={`${activeY}px`} aria-live="polite">
          <span class="state-arrow" aria-hidden="true">→</span>
          <strong>{step.title}</strong>
          <Figure source={shownState} idPrefix="quantum-state" scale={0.72}
            shapeOrder={['square', 'circle']} ariaLabel={`Quantum state: ${shownState}`} />
          {#if measuredNow}<small>{colors(measured!)}</small>{/if}
        </div>
      </div>
    {/if}
  </div>

  {#if showStates}<p class="state-key">A cloud shows a superposition. A minus sign marks an opposite amplitude, so contributions can cancel.</p>{/if}

  <div class="step-copy" aria-live="polite">
    <strong>Step {displayAt + 1} / {last + 1} · {step.title}</strong>
    <p>{step.instruction}</p>
  </div>
  <div class="playback">
    <button class="quiet-btn" disabled={at === 0 || moving} onclick={() => goTo(at - 1)}>← Back</button>
    <button class="action-btn" onclick={play}>{playing ? 'Pause' : paused && moving ? 'Resume' : at === last && !moving ? 'Run again' : 'Run circuit'}</button>
    <button class="quiet-btn" disabled={at === last || moving} onclick={() => goTo(at + 1)}>{at === last - 1 ? 'Measure →' : 'Step →'}</button>
  </div>

  {#if measuredNow}
    <div class="measurement-result" class:conclusive={solves} aria-live="polite">
      <Figure source={measured!.square + measured!.circle} idPrefix="measured-pair" scale={0.8} shapeOrder={['square', 'circle']}
        ariaLabel={`Measured pair. ${colors(measured!)}`} />
      <div>
        <p class="measured-colors">{colors(measured!)}</p>
        <strong>{solves ? (measured!.square === input[0] ? 'Both doors are safe to open' : 'A tiger is present — do not open both') : 'This circuit does not reliably distinguish the two cases'}</strong>
        <p>{solves ? (measured!.square === input[0] ? 'Square matches its input color · constant · both doors hold money.' : 'Square differs from its input color · balanced · exactly one tiger.') : 'Try changing the input colors or Hadamards. A measured color alone is not proof that both doors are safe.'}</p>
        {#if showStates}
          <small>Possible pairs (square, circle): {experiment.outcomes.map((outcome) => `(${outcome.square === '0' ? 'white' : 'black'}, ${outcome.circle === '0' ? 'white' : 'black'}) ${Math.round(outcome.probability * 100)}%`).join(' · ')}.</small>
        {/if}
        {#if experiment.outcomes.length > 1}<small>One pair was randomly sampled from this superposition. Run again for a fresh measurement.</small>{/if}
      </div>
    </div>
  {/if}
</div>

{#if drag && dragged}
  <div class="drag-ghost" style:left={`${drag.x}px`} style:top={`${drag.y}px`} aria-hidden="true">H</div>
{/if}

<style>
  .quantum-oracle { display: grid; gap: 10px; }
  .input-hint { margin: 0; color: var(--text-dim); font-size: 0.7rem; }
  .quantum-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .quantum-tools p { flex: 1; min-width: 155px; margin: 0; font-size: 0.76rem; }
  .quantum-tools p span { display: block; color: var(--text-dim); font-size: 0.7rem; margin-top: 2px; }
  .h-tile, .drag-ghost { display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 auto; color: #172331; background: var(--paper); border: 2px solid #4b637b; border-radius: 7px; font: 800 1.05rem/1 ui-monospace, monospace; box-shadow: 0 2px 5px var(--shadow); }
  .h-tile { cursor: grab; touch-action: none; }
  .quantum-options { display: flex; align-items: start; flex-wrap: wrap; justify-content: space-between; gap: 10px; font-size: 0.73rem; }
  .quantum-options label { display: flex; gap: 6px; align-items: center; cursor: pointer; font-weight: 650; }
  input { accent-color: var(--fill); }
  .circuit-hint { max-width: 260px; color: var(--text-dim); }
  .circuit-hint summary { cursor: pointer; }
  .circuit-hint p { margin: 7px 0; }
  .circuit-board { position: relative; display: grid; grid-template-columns: 1fr; padding: 12px 12px 72px 34px; color: #25313e; background: var(--paper); border: 1px solid var(--paper-edge); border-radius: 10px; }
  .circuit-board.with-states { grid-template-columns: minmax(136px, 0.85fr) minmax(0, 1.15fr); column-gap: 16px; }
  .circuit-column { min-width: 0; display: grid; justify-items: center; align-content: start; }
  .wire-labels { display: flex; justify-content: center; gap: 17px; font-size: 0.58rem; font-weight: 700; color: var(--paper-dim); padding-bottom: 5px; }
  .measurement-label { margin-top: 4px; color: var(--paper-dim); font-size: 0.62rem; }
  .row-step { position: absolute; z-index: 2; left: 8px; width: 21px; height: 21px; display: grid; place-items: center; transform: translateY(-50%); padding: 0; border: 1px solid #aab3bf; border-radius: 50%; color: #687381; background: var(--paper); font-family: inherit; font-size: 0.6rem; font-weight: 650; cursor: pointer; }
  .row-step.current { background: #315b9c; color: white; border-color: #315b9c; box-shadow: 0 0 0 3px #315b9c22; }
  .row-step.past { border-color: #315b9c; color: #315b9c; }
  .state-lane { min-width: 0; border-left: 1px solid var(--paper-edge); }
  .lane-label { display: block; text-align: center; color: var(--paper-dim); font-size: 0.62rem; }
  .state-card { position: absolute; right: 10px; width: calc((100% - 46px - 16px) * 0.575 - 12px); display: grid; justify-items: center; gap: 5px; padding: 8px; transform: translateY(-18px); border: 1px solid #a7bbd4; border-radius: 8px; background: color-mix(in srgb, #315b9c 5%, var(--paper)); }
  .state-card strong { font-size: 0.65rem; text-align: center; }
  .state-card small { color: #596472; font-size: 0.6rem; }
  .state-card :global(.figure) { width: 100%; display: grid; place-items: center; }
  .state-arrow { position: absolute; left: -17px; top: 7px; color: #315b9c; }
  .gate-slot { position: absolute; z-index: 3; display: grid; place-items: center; width: 46px; height: 45px; padding: 0; transform: translate(-50%, -50%); color: #315b9c; background: color-mix(in srgb, var(--paper) 88%, transparent); border: 2px dashed #315b9c; border-radius: 6px; cursor: pointer; touch-action: none; font: 800 0.68rem/1 ui-monospace, monospace; }
  .gate-slot.filled { color: transparent; background: transparent; border-color: transparent; cursor: grab; }
  .gate-slot.in-flight:not(.filled) { background: transparent; color: transparent; border-color: transparent; }
  .gate-slot.filled:hover, .gate-slot.filled:focus-visible { border-color: #a8322f; }
  .gate-slot.over { background: #dc670030; border-color: #dc6700; }
  .step-copy { min-height: 65px; font-size: 0.76rem; }
  .state-key { margin: 0; color: var(--text-dim); font-size: 0.66rem; line-height: 1.4; }
  .step-copy p { margin: 4px 0 0; color: var(--text-dim); line-height: 1.45; }
  .playback { margin: 0; }
  .measurement-result { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; background: var(--panel-2); font-size: 0.75rem; }
  .measurement-result.conclusive { border-left: 3px solid var(--fill); }
  .measurement-result :global(.figure) { flex: 0 0 auto; background: var(--paper); border-radius: 4px; }
  .measurement-result p { margin: 3px 0 0; color: var(--text-dim); }
  .measurement-result .measured-colors { margin: 0 0 5px; color: var(--text); font-weight: 700; }
  .measurement-result small { display: block; margin-top: 5px; color: var(--text-dim); }
  .drag-ghost { position: fixed; z-index: 999; pointer-events: none; transform: translate(-50%, -50%) rotate(4deg); }
  @media (max-width: 520px) {
    .circuit-board { padding-left: 29px; padding-right: 8px; }
    .circuit-board.with-states { grid-template-columns: 122px minmax(0, 1fr); column-gap: 9px; }
    .state-card { right: 8px; width: calc(100% - 29px - 122px - 9px - 12px); padding: 6px; }
    .row-step { left: 4px; }
    .state-card strong { font-size: 0.6rem; }
    .state-arrow { left: -12px; }
    .quantum-tools .quiet-btn { padding-inline: 6px; }
  }
</style>
