<script lang="ts">
  import Figure from './lib/Figure.svelte';
  import Doors from './lib/Doors.svelte';
  import Oracle from './lib/Oracle.svelte';
  import QuantumOracle from './lib/QuantumOracle.svelte';
  import type { Hadamards, InitialState } from './lib/quantum';
  import {
    WHERE,
    oracle as oracleGate,
    oracleOutput,
    type Where,
  } from './lib/game';
  import { theme } from './lib/theme.svelte';

  type Door = 'white' | 'black';
  type Mode = 'explore' | 'single' | 'quantum';
  type OracleView = 'oracle' | 'inside';

  const embedded = window.self !== window.top;
  const MODES: { id: Mode; number: string; title: string; short: string }[] = [
    { id: 'explore', number: '01', title: 'Explore', short: 'Query freely' },
    { id: 'single', number: '02', title: 'One query', short: 'Oracle shuts off' },
    { id: 'quantum', number: '03', title: 'Quantum oracle', short: 'Build, follow, measure' },
  ];

  let mode = $state<Mode>('explore');
  let oracleView = $state<OracleView>('oracle');
  let where = $state<Where>('black');
  let revealed = $state(false);
  let selectedDoor = $state<Door>('white');
  let circleInput = $state<'0' | '1'>('0');
  let asked = $state<Door[]>([]);
  let phase = $state<'idle' | 'entering' | 'inside' | 'leaving' | 'done'>('idle');
  let queryRun = 0;

  const currentAsked = $derived(
    phase === 'idle' ? selectedDoor : asked.length ? asked[asked.length - 1] : selectedDoor,
  );
  const querySquare = $derived((currentAsked === 'black' ? '1' : '0') as '0' | '1');
  const circleOutput = $derived(oracleOutput(where, querySquare, circleInput));
  const queryRunning = $derived(phase !== 'idle' && phase !== 'done');
  const oracleSpent = $derived(mode === 'single' && asked.length >= 1);
  const observations = $derived([...new Set(asked.slice(0, queryRunning ? -1 : undefined))]);

  let gates = $state<Hadamards>([false, false, false, false]);
  let quantumInput = $state<InitialState>('01');
  let round = $state(0);

  function cancelQuery() {
    queryRun += 1;
    asked = [];
    phase = 'idle';
  }

  function resetActivity() {
    cancelQuery();
    round += 1;
  }

  function selectMode(next: Mode) {
    mode = next;
    resetActivity();
  }

  function place(next: Where) {
    where = next;
    revealed = false;
    resetActivity();
  }

  function chooseDoor(next: Door) {
    if (queryRunning || oracleSpent) return;
    selectedDoor = next;
    if (phase === 'done') phase = 'idle';
  }

  function toggleQueryInput(wire: number) {
    if (queryRunning || oracleSpent) return;
    if (wire === 0) selectedDoor = selectedDoor === 'white' ? 'black' : 'white';
    else circleInput = circleInput === '0' ? '1' : '0';
    phase = 'idle';
  }

  function shuffle() {
    const options: Where[] = ['none', 'white', 'black'];
    where = options[Math.floor(Math.random() * options.length)];
    revealed = false;
    resetActivity();
  }

  async function ask() {
    if (queryRunning || oracleSpent || (mode !== 'explore' && mode !== 'single')) return;
    const run = ++queryRun;
    asked = [...asked, selectedDoor];
    const beat = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    // The white-door oracle has NOTs around its inverted control, so Misty's
    // three-layer animation takes longer than the one-layer cases.
    const duration = where === 'white' ? 1450 : 760;

    phase = 'entering';
    await beat(duration * 0.25);
    if (run !== queryRun) return;
    phase = 'inside';
    await beat(duration * 0.4);
    if (run !== queryRun) return;
    phase = 'leaving';
    await beat(duration * 0.35);
    if (run !== queryRun) return;
    phase = 'done';
  }

  let mainEl: HTMLElement;
  let isFullscreen = $state(false);

  $effect(() => {
    const onFullscreen = () => (isFullscreen = !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else mainEl.requestFullscreen();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    if (event.key === 'f' || event.key === 'F') toggleFullscreen();
    if (event.key === 'd' || event.key === 'D') theme.toggle();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main bind:this={mainEl} class="shell" class:fullscreen={isFullscreen}>
  <header class="bar">
    <div>
      <p class="course">PHYS 137T · QUANTUM INFORMATION</p>
      <h1>Money or Tiger?</h1>
      <p class="sub">Can one oracle query tell whether both doors are safe to open?</p>
    </div>
    <div class="controls">
      {#if !embedded}
        <button
          class="icon-btn"
          onclick={() => theme.toggle()}
          title={theme.isDark ? 'Light mode (D)' : 'Dark mode (D)'}
          aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {#if theme.isDark}
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          {/if}
        </button>
      {/if}
      <button
        class="icon-btn"
        onclick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {#if isFullscreen}
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        {/if}
      </button>
    </div>
  </header>

  <nav class="modebar" aria-label="Activity mode">
    {#each MODES as item}
      <button
        class="mode-tab"
        class:active={mode === item.id}
        aria-current={mode === item.id ? 'step' : undefined}
        onclick={() => selectMode(item.id)}
      >
        <span class="mode-number">{item.number}</span>
        <span class="mode-copy">
          <strong>{item.title}</strong>
          <small>{item.short}</small>
        </span>
      </button>
    {/each}
  </nav>

  <section class="workspace" class:quantum={mode === 'quantum'}>
    <section class="show-panel" aria-labelledby="show-heading">
      <div class="section-head">
        <div>
          <p class="eyebrow">The game show</p>
          <h2 id="show-heading">What is behind the doors?</h2>
        </div>
        <button class="quiet-btn" onclick={shuffle}>New round</button>
      </div>

      <Doors {where} open={revealed} onToggle={() => (revealed = !revealed)} />

      <p class="promise">
        <span class="promise-mark" aria-hidden="true">!</span>
        <span>Either <strong>both doors hold money</strong>, or <strong>exactly one hides a tiger</strong>.</span>
      </p>

      <p class="game-instruction">Use the oracle to decide whether opening both doors is safe. Press the center button to reveal the answer.</p>

      <details class="setup">
        <summary>Choose a setup (reveals the answer)</summary>
        <div class="case-picker" aria-label="Choose what is behind the doors">
          {#each WHERE as option}
            <button
              class="case-btn"
              class:active={where === option.id}
              aria-pressed={where === option.id}
              onclick={() => place(option.id)}
            >{option.short}</button>
          {/each}
        </div>
      </details>
    </section>

    <section class="lab-panel" aria-labelledby="lab-heading">
      <div class="section-head lab-head">
        <div>
          <p class="eyebrow">The oracle lab</p>
          <h2 id="lab-heading">{MODES.find((item) => item.id === mode)?.title}</h2>
        </div>
        {#if mode === 'explore'}
          <span class="query-count">{asked.length} {asked.length === 1 ? 'query' : 'queries'}</span>
        {:else if mode === 'single'}
          <span class="query-count">{asked.length} / 1 query</span>
        {/if}
      </div>

      <div class="oracle-viewbar">
        <span class="picker-label">View</span>
        <div class="view-switch" role="group" aria-label="Show the oracle or its implementation">
          <button
            class:active={oracleView === 'oracle'}
            disabled={queryRunning}
            aria-pressed={oracleView === 'oracle'}
            onclick={() => (oracleView = 'oracle')}
          >Oracle</button>
          <button
            class:active={oracleView === 'inside'}
            disabled={queryRunning}
            aria-pressed={oracleView === 'inside'}
            onclick={() => (oracleView = 'inside')}
          >Inside</button>
        </div>
        {#if oracleView === 'inside'}<span class="view-description">The hidden rule is visible</span>{/if}
      </div>

      {#if mode === 'explore' || mode === 'single'}
        <p class="mode-intro">
          {mode === 'explore'
            ? 'Choose a door with the square control. Query as often as you like.'
            : 'Can you decide whether both doors are safe with just one query? Choose a door, then query.'}
        </p>

        <div class="door-picker" aria-label="Square control value">
          <span class="picker-label">Ask about</span>
          <button
            class="door-choice"
            class:active={selectedDoor === 'white'}
            disabled={queryRunning || oracleSpent}
            aria-pressed={selectedDoor === 'white'}
            onclick={() => chooseDoor('white')}
          >
            <Figure source="0" idPrefix="pick-white" scale={0.56} shapeOrder={['square']} />
            White door
          </button>
          <button
            class="door-choice"
            class:active={selectedDoor === 'black'}
            disabled={queryRunning || oracleSpent}
            aria-pressed={selectedDoor === 'black'}
            onclick={() => chooseDoor('black')}
          >
            <Figure source="1" idPrefix="pick-black" scale={0.56} shapeOrder={['square']} />
            Black door
          </button>
        </div>

        <Oracle
          source={oracleGate(where)}
          view={oracleView}
          square={querySquare}
          circleIn={circleInput}
          circleOut={circleOutput}
          {phase}
          query={asked.length}
          offline={oracleSpent && phase === 'done'}
          onToggleInput={toggleQueryInput}
        />

        <div class="query-actions">
          <button class="action-btn" disabled={queryRunning || oracleSpent} onclick={ask}>
            {queryRunning ? 'Query in progress…' : 'Query oracle'}
          </button>
          {#if asked.length > 0}
            <button class="quiet-btn" disabled={queryRunning} onclick={cancelQuery}>
              {mode === 'single' ? 'Retry same doors' : 'Clear queries'}
            </button>
          {/if}
        </div>

        {#if mode === 'explore' && observations.length > 0}
          <p class="query-notes" aria-live="polite">
            Learned so far:
            {observations.map((door) => `${door === 'white' ? 'White' : 'Black'} door — ${where === door ? 'tiger' : 'money'}`).join(' · ')}.
          </p>
        {/if}

        {#if mode === 'single' && oracleSpent && phase === 'done'}
          <p class="question-card">
            You learned one door. Is that enough to decide whether opening both is safe?
          </p>
        {/if}
      {:else}
        <p class="mode-intro">
          Build a circuit that tells whether both doors are safe with one query. Add H gates before or after the oracle, then run or step through to the measurement.
        </p>
        <QuantumOracle {where} view={oracleView} {round} bind:gates bind:input={quantumInput} />
      {/if}
    </section>
  </section>

  <p class="hint">D theme · F fullscreen</p>
</main>
