<script lang="ts">
  import Figure from './Figure.svelte';
  import InputQubitToggle from './InputQubitToggle.svelte';
  import { ORACLE_GATE } from './game';

  let {
    source,
    view,
    square,
    circleIn,
    circleOut,
    phase,
    query,
    offline = false,
    onToggleInput,
  }: {
    /** The same implementation used by the quantum oracle. */
    source: string;
    view: 'oracle' | 'inside';
    square: '0' | '1';
    circleIn: '0' | '1';
    circleOut: '0' | '1';
    phase: 'idle' | 'entering' | 'inside' | 'leaving' | 'done';
    /** Makes each repeated query a fresh SVG animation. */
    query: number;
    offline?: boolean;
    onToggleInput: (wire: number) => void;
  } = $props();

  const flipped = $derived(circleIn !== circleOut);
  const running = $derived(phase !== 'idle');
  const insideName = $derived(
    source.startsWith('I ') ? 'IDENTITY' : source.includes('\n') ? 'NOT · CNOT · NOT' : 'CNOT',
  );
  const sealedSource = `shape so\nqubits 2\n${ORACLE_GATE}`;
  const queryDuration = $derived(source.includes('\n') ? 1450 : 760);
  const circuitSource = $derived(
    [
      'shape so',
      `in ${square}${circleIn}`,
      source,
      `# query ${query}`,
      'animate speed=3.8',
    ].join('\n'),
  );

  let insideFig = $state<ReturnType<typeof Figure> | null>(null);
  let stage: HTMLDivElement;
  let inputs = $state<Array<{ x: number; y: number } | null>>([]);
  function measureInputs() {
    if (!stage) return;
    const frame = stage.getBoundingClientRect();
    inputs = [0, 1].map((wire) => {
      if (view === 'oracle') return { x: frame.width / 2 + (wire === 0 ? -27 : 27), y: 15 };
      const point = insideFig?.inputPoint(wire);
      return point ? { x: point.x - frame.left, y: point.y - frame.top } : null;
    });
  }
  $effect(() => {
    void view; void circuitSource; void phase; void insideFig;
    if (!stage) return;
    const observer = new ResizeObserver(measureInputs);
    observer.observe(stage);
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(measureInputs); });
    return () => { observer.disconnect(); cancelAnimationFrame(first); cancelAnimationFrame(second); };
  });
</script>

<div class="oracle" class:offline class:busy={phase === 'inside'}>
  <header class="oracle-head">
    <div>
      <span class="serial">ORACLE U<sub>f</sub></span>
      <strong>
        {#if view === 'oracle'}
          TIGER?
        {:else}
          INSIDE · {insideName}
        {/if}
      </strong>
    </div>
    <span class="power" class:off={offline}>
      <i aria-hidden="true"></i>{offline ? 'OFFLINE' : phase === 'inside' ? 'QUERYING' : 'READY'}
    </span>
  </header>

  <div class="misty-stage">
    <div class="wire-key" aria-hidden="true">
      <span><i class="square-mark"></i> square · control</span>
      <span><i class="circle-mark"></i> circle · target</span>
    </div>

    <div class="animation-stage" bind:this={stage}>
      {#if view === 'inside'}
        {#key circuitSource}
          <div class="query-figure" class:running>
            <Figure
              bind:this={insideFig}
              source={circuitSource}
              idPrefix={`query-circuit-inside-${query}-${square}-${running ? 'run' : 'ready'}`}
              scale={0.98}
              shapeOrder={['square', 'circle']}
              ariaLabel="The circle and square pass through the circuit inside the oracle"
            />
          </div>
        {/key}
      {:else}
        <div class="oracle-gate">
          <Figure
            source={sealedSource}
            idPrefix="query-sealed-oracle"
            scale={0.9}
            shapeOrder={['square', 'circle']}
            ariaLabel="The sealed Tiger question oracle"
          />
        </div>

        {#key `${query}-${square}-${circleIn}-${circleOut}`}
          <div
            class="oracle-motion"
            style={`--query-duration: ${queryDuration}ms`}
            aria-hidden="true"
          >
            <div class="traveller square-traveller" class:running>
              <Figure
                source={square}
                idPrefix={`query-square-${query}-${square}`}
                scale={0.9}
                shapeOrder={['square']}
              />
            </div>
            <div class="traveller circle-traveller" class:running>
              <div class="circle-state circle-before">
                <Figure
                  source={circleIn}
                  idPrefix={`query-circle-in-${query}-${circleIn}`}
                  scale={0.9}
                  shapeOrder={['circle']}
                />
              </div>
              <div class="circle-state circle-after">
                <Figure
                  source={circleOut}
                  idPrefix={`query-circle-out-${query}-${circleOut}`}
                  scale={0.9}
                  shapeOrder={['circle']}
                />
              </div>
            </div>
          </div>
        {/key}
      {/if}
      {#if phase === 'idle' && !offline}
        {#each inputs as point, wire}
          {#if point}
            <InputQubitToggle shape={wire === 0 ? 'square' : 'circle'} value={wire === 0 ? square : circleIn}
              x={point.x} y={point.y} onToggle={() => onToggleInput(wire)} />
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <p class="readout" aria-live="polite">
    {#if phase === 'idle'}
      Click either initial qubit to switch white ↔ black. The square selects a door; the circle flips if a tiger is there.
    {:else if phase === 'entering' || phase === 'inside'}
      The circle and square are passing through the oracle…
    {:else if flipped}
      <strong>Circle flipped to {circleOut === '0' ? 'white' : 'black'}:</strong> a tiger is behind the selected door.
    {:else}
      <strong>Circle stayed {circleOut === '0' ? 'white' : 'black'}:</strong> money is behind the selected door.
    {/if}
    {#if offline}<br />Query used. The oracle is now off.{/if}
  </p>
</div>

<style>
  .oracle {
    overflow: hidden;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: 12px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
    transition: filter 180ms, opacity 180ms;
  }

  .oracle.offline {
    filter: grayscale(0.78);
    opacity: 0.66;
  }

  .oracle-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 13px;
    color: #eaf1f8;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.1), transparent 34%),
      #273342;
    border-bottom: 1px solid #17202a;
  }

  .oracle-head > div {
    display: grid;
    gap: 2px;
  }

  .serial {
    color: #9fb0c1;
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.14em;
  }

  .oracle-head strong {
    font-size: 1rem;
    letter-spacing: 0.16em;
  }

  .power {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #b8c6d3;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .power i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #62cf8a;
    box-shadow: 0 0 9px rgba(98,207,138,0.75);
  }

  .power.off i {
    background: #e06b62;
    box-shadow: none;
  }

  .misty-stage {
    position: relative;
    display: grid;
    min-height: 250px;
    place-items: center;
    padding: 14px 16px 12px;
    background:
      radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--fill) 5%, transparent), transparent 58%),
      var(--paper);
  }

  .query-figure {
    display: grid;
    min-width: 210px;
    place-items: center;
  }

  .query-figure:not(.running) {
    --misty-play: paused;
  }

  .animation-stage {
    position: relative;
    display: grid;
    min-width: 210px;
    min-height: 220px;
    place-items: center;
  }

  .oracle-gate {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  .query-figure {
    position: relative;
    z-index: 1;
  }

  .oracle-motion {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  .traveller {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
  }

  .traveller.running {
    animation: oracle-travel var(--query-duration) cubic-bezier(0.35, 0, 0.65, 1) both;
  }

  .square-traveller { left: calc(50% - 27px); }

  .circle-traveller {
    left: calc(50% + 27px);
    width: 32px;
    height: 32px;
  }

  .circle-state {
    position: absolute;
    inset: 0;
  }

  .circle-after { opacity: 0; }

  .circle-traveller.running .circle-before {
    animation: oracle-input var(--query-duration) step-end both;
  }

  .circle-traveller.running .circle-after {
    animation: oracle-output var(--query-duration) step-end both;
  }

  @keyframes oracle-travel {
    from { transform: translate(-50%, 0); }
    to { transform: translate(-50%, 188px); }
  }

  @keyframes oracle-input {
    0%, 49.99% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  @keyframes oracle-output {
    0%, 49.99% { opacity: 0; }
    50%, 100% { opacity: 1; }
  }

  .wire-key {
    position: absolute;
    top: 12px;
    left: 13px;
    display: grid;
    gap: 7px;
    color: var(--paper-dim);
    font-size: 0.6rem;
  }

  .wire-key span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .wire-key i {
    display: inline-block;
    width: 12px;
    height: 12px;
    background: #fff;
    border: 2px solid #111;
  }

  .wire-key .circle-mark { border-radius: 50%; }

  .readout {
    min-height: 39px;
    margin: 0;
    padding: 10px 13px;
    color: var(--paper-dim);
    background: color-mix(in srgb, var(--paper-edge) 28%, var(--paper));
    border-top: 1px solid var(--paper-edge);
    font-size: 0.76rem;
    line-height: 1.45;
    text-align: center;
  }

  .readout strong { color: #314256; }

  @media (max-width: 430px) {
    .serial,
    .wire-key { display: none; }
    .misty-stage { padding-inline: 6px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .oracle { transition: none; }
  }
</style>
