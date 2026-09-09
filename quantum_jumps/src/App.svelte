<script lang="ts">
  import Trap from './lib/Trap.svelte';
  import Levels from './lib/Levels.svelte';
  import Chart from './lib/Chart.svelte';
  import {
    T_MAX,
    TIME_STEP,
    PHOTON_HIST_MAX,
    makeShot,
    binKey,
    snapDuration,
    type BinData,
  } from './lib/physics';

  // ═══════════════ State ═══════════════

  let duration = $state(0);
  let busy = $state(false);
  let showTheory = $state(false);
  let viewportWidth = $state(0);
  let isMobile = $derived(viewportWidth > 0 && viewportWidth < 640);

  let ionState = $state<'bright' | 'dark' | 'pulsing'>('bright');
  let level = $state<'S' | 'D' | 'P'>('S');

  const binMap = new Map<number, BinData>();
  let shotCount = $state(0);
  let photonHistogram = $state<number[]>(
    Array(PHOTON_HIST_MAX + 1).fill(0),
  );

  // Fullscreen
  let mainEl: HTMLElement;
  let isFullscreen = $state(false);

  $effect(() => {
    function onFsChange() {
      isFullscreen = !!document.fullscreenElement;
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mainEl.requestFullscreen();
    }
  }

  // ═══════════════ Data ═══════════════

  function record(t: number) {
    const { outcome, photonCount } = makeShot(t);
    const key = binKey(t);
    const b = binMap.get(key) ?? { bright: 0, dark: 0 };
    outcome ? b.dark++ : b.bright++;
    binMap.set(key, b);
    photonHistogram[Math.min(photonCount, PHOTON_HIST_MAX)]++;
    shotCount++;
    return outcome;
  }

  function wait(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  function setViz(ion: 'bright' | 'dark' | 'pulsing', lev: 'S' | 'D' | 'P') {
    ionState = ion;
    level = lev;
  }

  // ═══════════════ Actions ═══════════════

  async function runOnce() {
    if (busy) return;
    busy = true;
    const t = duration;
    setViz('pulsing', 'S');
    await wait(300);
    const outcome = record(t);
    setViz(outcome ? 'dark' : 'bright', outcome ? 'D' : 'S');
    await wait(650);
    setViz('bright', 'S');
    busy = false;
  }

  async function runBatch() {
    if (busy) return;
    busy = true;
    const t = duration;
    for (let i = 0; i < 100; i++) {
      const outcome = record(t);
      if (i % 10 === 0 || i === 99) {
        setViz(outcome ? 'dark' : 'bright', outcome ? 'D' : 'S');
        await wait(8);
      }
    }
    setViz('bright', 'S');
    busy = false;
  }

  async function sweep() {
    if (busy) return;
    busy = true;
    const steps = Math.round(T_MAX / 0.5) + 1;
    for (let si = 0; si < steps; si++) {
      const t = si * 0.5;
      setDuration(t);
      let lastOutcome = 0;
      for (let j = 0; j < 100; j++) {
        lastOutcome = record(t);
      }
      setViz(lastOutcome ? 'dark' : 'bright', lastOutcome ? 'D' : 'S');
      await wait(22);
    }
    setViz('bright', 'S');
    busy = false;
  }

  function clearAll() {
    binMap.clear();
    photonHistogram.fill(0);
    shotCount = 0;
    setViz('bright', 'S');
  }

  function setDuration(next: number) {
    const snapped = snapDuration(Math.max(0, Math.min(T_MAX, next)));
    if (snapped === duration) return;
    duration = snapped;
    photonHistogram.fill(0);
  }

  function onDurationInput(e: Event) {
    setDuration(Number((e.currentTarget as HTMLInputElement).value));
  }

  // ═══════════════ Keyboard ═══════════════

  function onKeydown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement &&
      (e.target as HTMLInputElement).type !== 'checkbox'
    )
      return;
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        runOnce();
        break;
      case 'b':
      case 'B':
        runBatch();
        break;
      case 's':
      case 'S':
        sweep();
        break;
      case 'c':
      case 'C':
        clearAll();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setDuration(duration - 0.1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        setDuration(duration + 0.1);
        break;
      case 't':
      case 'T':
        showTheory = !showTheory;
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
    }
  }

  const btnBase =
    'font-weight:500;border-radius:6px;cursor:pointer;transition:all .12s;font-family:inherit;';
</script>

<svelte:window onkeydown={onKeydown} bind:innerWidth={viewportWidth} />

<main
  bind:this={mainEl}
  class="app-root"
  style:padding={isFullscreen ? '20px 24px' : '10px 12px'}
>
  <!-- Header -->
  <header class="app-header">
    <div>
      <h1 class="app-title" style:font-size={isFullscreen ? '1.5rem' : '1.15rem'}>
        Quantum Jumps: Rabi Oscillation
      </h1>
      <p class="app-subtitle">
        PHYS 137T · Lecture 5 ·
        <a
          href="https://doi.org/10.1103/PhysRevLett.57.1699"
          target="_blank"
          rel="noopener"
          style="color:#8A919B;text-decoration:none;border-bottom:1px solid #3A3E48;"
        >
          Bergquist <i>et al.</i>, PRL <b>57</b>, 1699 (1986)
        </a>
      </p>
    </div>
    <button
      onclick={toggleFullscreen}
      title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
      class="fullscreen-btn"
    >
      {#if isFullscreen}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      {/if}
    </button>
  </header>

  <!-- Content: responsive grid -->
  <div class="content-grid">
    <div class="trap-panel panel-bg">
      <Trap {ionState} compact={isMobile} />
    </div>
    <div class="levels-panel panel-bg">
      <Levels {level} {ionState} compact={isMobile} />
    </div>
    <div class="chart-panel panel-bg">
      <Chart
        {binMap}
        {shotCount}
        {photonHistogram}
        {duration}
        onDurationChange={setDuration}
        {showTheory}
      />
    </div>
  </div>

  <!-- Controls -->
  <div class="controls-bar">
    <!-- Slider row -->
    <div class="slider-row">
      <span class="slider-label">282 nm pulse</span>
      <input
        type="range"
        min="0"
        max={T_MAX}
        step={TIME_STEP}
        value={duration}
        oninput={onDurationInput}
        class="flex-1"
        aria-label="Shelving pulse duration in microseconds"
      />
      <span class="slider-value">
        {duration.toFixed(2)} μs
      </span>
    </div>

    <!-- Button row -->
    <div class="button-row">
      <button
        onclick={runOnce}
        disabled={busy}
        class="btn btn-primary"
        style="{btnBase}opacity:{busy ? 0.35 : 1};"
      >Run once</button>
      <button
        onclick={runBatch}
        disabled={busy}
        class="btn btn-secondary"
        style="{btnBase}opacity:{busy ? 0.35 : 1};"
      >Run 100</button>
      <button
        onclick={sweep}
        disabled={busy}
        class="btn btn-secondary"
        style="{btnBase}opacity:{busy ? 0.35 : 1};"
      >Sweep</button>
      <button
        onclick={clearAll}
        class="btn btn-secondary"
        style={btnBase}
      >Clear</button>

      <button
        onclick={() => (showTheory = !showTheory)}
        class="btn btn-theory"
        style="{btnBase}margin-left:auto;
               background:{showTheory ? '#E6E8EC' : 'transparent'};
               border-color:{showTheory ? '#E6E8EC' : '#282B33'};
               color:{showTheory ? '#111215' : '#707880'};"
      >
        sin²(Ωt/2)
      </button>
    </div>
  </div>

  <!-- Keyboard hints (desktop only) -->
  <div class="keyboard-hints">
    Space run · B batch · S sweep · C clear · ← → adjust · T theory · F fullscreen
  </div>
</main>
