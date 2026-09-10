<script lang="ts">
  import Figure from './lib/Figure.svelte';
  import Doors from './lib/Doors.svelte';
  import Oracle from './lib/Oracle.svelte';
  import {
    WHERE,
    STAGES,

    quantumCircuit,
    classicalAnswer,
    stateAt,
    verdict,
    type Where,
  } from './lib/game';
  import { theme } from './lib/theme.svelte';

  const embedded = window.self !== window.top;
  const SHAPES = ['circle', 'square'];

  // ── Where the tiger is ──
  //
  // Hidden by default. The point of the lecture is that you do not know, and a
  // demo that shows you the answer up front is a demo of the answer.

  let where = $state<Where>('black');
  let revealed = $state(false);

  function place(next: Where) {
    where = next;
    reset();
  }

  function shuffle() {
    const options: Where[] = ['none', 'white', 'black'];
    where = options[Math.floor(Math.random() * options.length)];
    revealed = false;
    reset();
  }

  // ── The classical attempt ──

  let asked = $state<'white' | 'black' | null>(null);
  /** Where the circle is on its way through the box. */
  let phase = $state<'idle' | 'entering' | 'inside' | 'leaving' | 'done'>('idle');

  const classicalFlipped = $derived(asked ? classicalAnswer(where, asked) : false);

  /**
   * Send the circle through, one leg at a time.
   *
   * Staged rather than a single transition so the box can hold the circle for a
   * beat: the flip happens out of sight, which is the honest picture of an
   * oracle — you see what went in and what came out, never the mechanism.
   */
  async function ask(door: 'white' | 'black') {
    if (asked) return; // the oracle works once
    asked = door;
    const beat = (ms: number) => new Promise((r) => setTimeout(r, ms));
    phase = 'entering';
    await beat(60);
    phase = 'inside';
    await beat(620);
    phase = 'leaving';
    await beat(560);
    phase = 'done';
  }

  function resetQuery() {
    asked = null;
    phase = 'idle';
  }

  // ── The quantum way ──

  let at = $state(-1);
  let playing = $state(false);

  const stage = $derived(at >= 0 ? STAGES[at] : null);
  const last = STAGES.length - 1;

  function reset() {
    asked = null;
    phase = 'idle';
    at = -1;
    playing = false;
  }

  $effect(() => {
    if (!playing) return;
    if (at >= last) {
      playing = false;
      return;
    }
    const id = setTimeout(() => (at += 1), 1500);
    return () => clearTimeout(id);
  });

  /**
   * The circuit is drawn once, whole, and the state travels down it.
   *
   * Building it up stage by stage made the diagram jump about as it grew.
   * Drawing it once and moving a cloud along it is what the lecture describes
   * anyway — the state passes *through* the gates.
   */
  const fullCircuit = $derived(quantumCircuit(where, 'measure'));

  /** The state after the stage we have reached. */
  const shownState = $derived.by(() => {
    if (!stage) return stateAt(where, 'start');
    try {
      return stateAt(where, stage.id === 'measure' ? 'interfered' : stage.id);
    } catch {
      return '';
    }
  });

  /**
   * Which circuit layer the state has passed. -1 is the input row.
   *
   * The white-door oracle takes three layers rather than one, because
   * inverting a control needs a NOT either side, so the rows after it shift.
   */
  const oracleLayers = $derived(where === 'white' ? 3 : 1);

  const passed = $derived.by(() => {
    switch (stage?.id) {
      case undefined:
      case 'start':
        return -1;
      case 'superposed':
        return 0;
      case 'queried':
        return oracleLayers;
      case 'interfered':
        return oracleLayers + 1;
      default:
        return oracleLayers + 2;
    }
  });

  let circuitFig = $state<ReturnType<typeof Figure> | null>(null);
  let travelY = $state<number | null>(null);

  $effect(() => {
    const layer = passed;
    void where;
    void shownState;
    if (!circuitFig) return;
    const id = requestAnimationFrame(() => {
      travelY = circuitFig?.rowY(layer) ?? null;
    });
    return () => cancelAnimationFrame(id);
  });

  const answer = $derived(verdict(where));
  const finished = $derived(at >= last);

  // ── Fullscreen ──

  let mainEl: HTMLElement;
  let isFullscreen = $state(false);

  $effect(() => {
    const on = () => (isFullscreen = !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else mainEl.requestFullscreen();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === 'd' || e.key === 'D') theme.toggle();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main bind:this={mainEl} class="shell" class:fullscreen={isFullscreen}>
  <header class="bar">
    <div class="min-w-0">
      <h1>Money or Tiger</h1>
      <p class="sub">PHYS 137T · Lecture 8 · Interference and Deutsch–Jozsa</p>
    </div>
    <div class="controls">
      {#if !embedded}
        <button class="icon-btn" onclick={() => theme.toggle()}
          title={theme.isDark ? 'Light mode (D)' : 'Dark mode (D)'}
          aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {#if theme.isDark}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          {/if}
        </button>
      {/if}
      <button class="icon-btn" onclick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        {#if isFullscreen}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        {/if}
      </button>
    </div>
  </header>

  <!-- The doors -->
  <section class="panel">
    <div class="panel-head">
      <h2 class="label">Two doors</h2>
      <div class="row">
        <button class="btn btn-secondary" onclick={shuffle}>Hide a tiger</button>
        <button class="btn btn-primary" onclick={() => (revealed = !revealed)}>
          {revealed ? 'Close the doors' : 'Open both doors'}
        </button>
      </div>
    </div>

    <Doors {where} open={revealed} />

    <p class="note">
      Behind each door is money or a tiger. One button opens <em>both</em>, so
      you do not care which door the tiger is behind — only whether there is one
      at all.
    </p>

    <div class="row" style="margin-top:9px">
      <span class="label" style="margin-right:3px">Put it</span>
      {#each WHERE as w}
        <button class="pill" aria-current={where === w.id}
                onclick={() => place(w.id)}>{w.short}</button>
      {/each}
    </div>
  </section>

  <!-- Classical -->
  <section class="panel">
    <div class="panel-head">
      <h2 class="label">The classical way</h2>
      <span class="count">{asked ? 1 : 0} of 1 query used</span>
    </div>

    <p class="say">
      The Oracle flips the circle if there is a tiger behind the door the square
      selects. Set the square to a door and send a white circle through.
    </p>

    <div class="row" style="margin-top:9px">
      <button class="btn btn-secondary" disabled={!!asked} onclick={() => ask('white')}>
        Ask about the white door
      </button>
      <button class="btn btn-secondary" disabled={!!asked} onclick={() => ask('black')}>
        Ask about the black door
      </button>
      {#if asked}
        <button class="btn btn-secondary" onclick={resetQuery}>Ask again</button>
      {/if}
    </div>

    <div style="margin-top:10px">
      <Oracle square={asked === 'black' ? '1' : '0'} circleIn="0"
              circleOut={classicalFlipped ? '1' : '0'} {phase} />
    </div>

    {#if phase === 'done'}
      <p class="note">
        You now know about the {asked} door and nothing about the other one, and
        the oracle is spent. Two doors would take two queries, and <em>n</em>
        doors would take <em>n</em>. No cleverness helps.
      </p>
    {/if}
  </section>

  <!-- Quantum -->
  <section class="panel">
    <div class="panel-head">
      <h2 class="label">The quantum way</h2>
      <div class="nav">
        <span class="count">Step {at + 1} of {last + 1}</span>
        <button class="nb" onclick={() => { playing = false; at = Math.max(-1, at - 1); }}
                disabled={at < 0} aria-label="Previous step">‹</button>
        <button class="play" onclick={() => { if (at >= last) at = -1; playing = !playing; }}
                aria-label={playing ? 'Pause' : 'Run the algorithm'}>
          {#if playing}
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            Pause
          {:else}
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
            {at >= last ? 'Again' : 'Run it'}
          {/if}
        </button>
        <button class="nb" onclick={() => { playing = false; at = Math.min(last, at + 1); }}
                disabled={at === last} aria-label="Next step">›</button>
      </div>
    </div>

    <div class="paperbox">
      <div class="travel">
        <div aria-hidden="true"></div>
        <Figure bind:this={circuitFig} source={fullCircuit}
                idPrefix={`q-${where}`} scale={1.05} shapeOrder={SHAPES}
                ariaLabel="The Deutsch circuit: Hadamards, the oracle once, Hadamards, then read the square" />

        <!-- The state rides down beside the circuit rather than on it. The
             rows are only a few pixels apart, so a state sitting on the wire
             covers the gates either side of it. -->
        <div class="lane">
          {#if shownState && travelY !== null}
            {#key shownState}
              <div class="rider" style:top={`${travelY}px`}>
                <Figure source={shownState} idPrefix={`s-${where}-${passed}`}
                        scale={1} shapeOrder={SHAPES}
                        ariaLabel="The state at this point in the circuit" />
              </div>
            {/key}
          {/if}
        </div>
      </div>
      <p class="say paper">
        {stage
          ? stage.say
          : 'Both qubits go in, the oracle is asked once, and interference does the rest. Press run.'}
      </p>
    </div>

    {#if finished}
      <p class="note">
        <span class="verdict" class:tiger={answer.tiger} class:safe={!answer.tiger}>
          {answer.tiger ? 'The square is black — there is a tiger.' : 'The square is white — no tiger.'}
        </span>
        One query, and you know whether it is safe to open both doors. You do
        <em>not</em> know which door, and you did not need to.
      </p>
    {/if}
  </section>

  <p class="hint">
    D theme · F fullscreen
  </p>
</main>
