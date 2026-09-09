<script lang="ts">
  import WaveField from './lib/WaveField.svelte';
  import Screen from './lib/Screen.svelte';
  import { envelopeHalfAngle, type Params } from './lib/physics';
  import { addTrace, pruneTraces, type Trace } from './lib/traces';
  import { theme } from './lib/theme.svelte';
  // The hub carries its own theme toggle in its workspace bar, so hide this one
  // when we are the framed demo rather than showing two moons 40px apart. The
  // fullscreen button stays: framing does not make it redundant.
  const embedded = window.self !== window.top;

  // Class defaults: 650 nm laser, 0.04 mm slits, 0.25 mm apart.
  //
  // Screen distance is a pure unit scale here and 1 m is as good as any. The
  // view auto-scales to the envelope, which is set by an angle, so moving the
  // screen further away magnifies the pattern and the axis by exactly the same
  // factor and the picture does not change. All it alters is the millimetre
  // readout — which is still worth having, since the fringe spacing in mm is
  // the number students can check against the wall.
  let wavelengthNm = $state(650);
  let slitWidthUm = $state(40);
  let separationUm = $state(250);
  let screenDistanceM = $state(1);
  let slits = $state<1 | 2>(2);

  // Start state can be set from the URL, so a slide can deep-link straight to
  // the particle picture: index.html?mode=particles
  const startMode =
    new URLSearchParams(location.search).get('mode') === 'particles'
      ? 'particles'
      : 'wave';

  let mode = $state<'wave' | 'particles'>(startMode);
  // Waves animate on load; the photon picture starts paused whichever way you
  // arrive at it, by button or by deep link.
  let running = $state(startMode === 'wave');
  // 10/s is slow enough that individual arrivals still read as individual
  // arrivals on a projector, and slow enough that the histogram takes long
  // enough to fill that the class watches it happen.
  let rate = $state(10);
  let resetKey = $state(0);
  let count = $state(0);

  let screen: ReturnType<typeof Screen> | undefined = $state();

  // Traces live here rather than in either panel: they are created by photon
  // events on the screen and drawn on the wave field, so neither child owns
  // them. `clock` drives the fade and is the only thing ticking when the
  // simulation is paused, which it is by default in the photon picture.
  let traces = $state<Trace[]>([]);
  let clock = $state(0);

  $effect(() => {
    if (traces.length === 0) return;
    let raf = 0;
    const tick = (t: number) => {
      clock = t;
      const kept = pruneTraces(traces, t);
      if (kept.length !== traces.length) traces = kept;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function onPhoton(xNorm: number) {
    traces = addTrace(traces, xNorm, performance.now());
  }

  const params: Params = $derived({
    wavelength: wavelengthNm * 1e-9,
    slitWidth: slitWidthUm * 1e-6,
    separation: separationUm * 1e-6,
    screenDistance: screenDistanceM,
    slits,
  });

  // Show a bit past the first envelope minimum, so the pattern always fills the
  // width without the fringes running off the edge when a slider moves.
  const halfWidth = $derived(
    Math.tan(envelopeHalfAngle(params)) * params.screenDistance * 1.15,
  );

  function reset() {
    resetKey += 1;
    traces = [];
  }

  function toParticles() {
    mode = 'particles';
    // Deliberately paused. Switching to the photon picture and having a
    // histogram immediately start filling itself skips the point: the class
    // should see one photon land on its own, and that only reads if nothing
    // happens until someone presses Fire one.
    running = false;
    reset();
  }

  // ── Fullscreen ──
  // Same control and F shortcut as the quantum jumps demo, so the two behave
  // alike on a projector.
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

  function onKeydown(e: KeyboardEvent) {
    // Leave the sliders alone — arrow keys and typing belong to them.
    if (
      e.target instanceof HTMLInputElement &&
      (e.target as HTMLInputElement).type !== 'checkbox'
    )
      return;
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === 'd' || e.key === 'D') theme.toggle();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- The column is capped for reading at a desk, but uncapped in fullscreen:
     a 64rem column centred on a projector is mostly black bars. -->
<main
  bind:this={mainEl}
  class="demo-shell mx-auto space-y-4 p-3 sm:p-5
         {isFullscreen ? 'max-w-none' : 'max-w-5xl'}"
  style="color: var(--text)"
>
  <header class="flex items-start justify-between gap-3">
    <div class="min-w-0 space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        Interference: waves, then one photon at a time
      </h1>
      <p class="text-sm" style="color: var(--text-dim)">
        PHYS 137T &middot; Lecture 4. Move the sliders and see what changes. Then
        switch to one photon at a time &mdash; what stays the same?
      </p>
    </div>
    <div class="flex flex-shrink-0 items-center gap-2">
      {#if !embedded}
      <button
        onclick={() => theme.toggle()}
        title={theme.isDark ? 'Light mode (D)' : 'Dark mode (D)'}
        aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        class="icon-btn"
      >
        {#if theme.isDark}
          <!-- Currently dark, so offer the sun. -->
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        {/if}
      </button>
      {/if}
      <button
        onclick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        class="icon-btn"
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
    </div>
  </header>

  <section class="grid gap-4 md:grid-cols-[1fr_2fr]">
    <div class="space-y-2">
      <h2 class="section-label text-xs font-medium uppercase tracking-wide">
        {slits === 2 ? 'Two slits' : 'One slit'}
      </h2>
      <!-- Wrapped in .scene-panel: this canvas depicts a beam in a dark room,
           so it stays dark in both themes. -->
      <div class="scene-panel">
        <WaveField
          {wavelengthNm}
          {separationUm}
          {slits}
          running={running && mode === 'wave'}
          fade={mode === 'particles' ? 0.7 : 0}
          traces={mode === 'particles' ? traces : []}
          now={clock}
        />
      </div>
      {#if mode === 'particles'}
        <p class="readout text-xs">
          Each photon is drawn through <strong>both</strong> slits at once,
          meeting at the spot where it landed.
        </p>
      {/if}
    </div>

    <div class="space-y-2">
      <h2 class="section-label text-xs font-medium uppercase tracking-wide">
        The screen
        {#if mode === 'particles'}
          <span class="ml-2 font-mono" style="color: var(--text)">
            {count.toLocaleString()} hits
          </span>
        {/if}
      </h2>
      <div class="scene-panel">
        <Screen bind:this={screen} {params} {halfWidth} {mode} {running} {rate} {resetKey}
                onCount={(n) => (count = n)} {onPhoton} />
      </div>
    </div>
  </section>

  <section class="demo-panel flex flex-wrap items-center gap-2 rounded-lg p-3">
    <button
      class="btn {mode === 'wave' ? 'btn-primary' : 'btn-secondary'}"
      onclick={() => (mode = 'wave')}
    >
      Waves
    </button>
    <button
      class="btn {mode === 'particles' ? 'btn-primary' : 'btn-secondary'}"
      onclick={toParticles}
    >
      One Photon at a Time
    </button>

    <div class="divider mx-1 h-6 w-px"></div>

    <button class="btn btn-secondary" onclick={() => (running = !running)}>
      {running ? 'Pause' : 'Play'}
    </button>

    {#if mode === 'particles'}
      <button class="btn btn-secondary" onclick={() => screen?.fireOne()}>
        Fire one
      </button>
      <label class="control-label flex items-center gap-2 text-sm">
        rate
        <input type="range" min="1" max="600" step="1" bind:value={rate} class="w-28" />
        <span class="readout w-16 font-mono text-xs">{rate}/s</span>
      </label>
    {/if}

    <button class="btn btn-secondary" onclick={reset}>Clear</button>

    <div class="divider mx-1 h-6 w-px"></div>

    <button
      class="btn {slits === 1 ? 'btn-primary' : 'btn-secondary'}"
      onclick={() => (slits = slits === 1 ? 2 : 1)}
    >
      {slits === 1 ? 'One slit' : 'Two slits'}
    </button>
  </section>

  <section class="demo-panel grid gap-4 rounded-lg p-4 sm:grid-cols-2 lg:grid-cols-4">
    <label class="space-y-1 text-sm">
      <span class="control-label">Wavelength</span>
      <input type="range" min="380" max="750" step="1" bind:value={wavelengthNm} class="w-full" />
      <span class="readout block font-mono text-xs">{wavelengthNm} nm</span>
    </label>
    <label class="space-y-1 text-sm">
      <span class="control-label">Slit width</span>
      <input type="range" min="20" max="300" step="5" bind:value={slitWidthUm} class="w-full" />
      <span class="readout block font-mono text-xs">{slitWidthUm} &micro;m</span>
    </label>
    <label class="space-y-1 text-sm {slits === 1 ? 'opacity-40' : ''}">
      <span class="control-label">Slit separation</span>
      <input type="range" min="60" max="800" step="10" bind:value={separationUm}
             disabled={slits === 1} class="w-full" />
      <span class="readout block font-mono text-xs">{separationUm} &micro;m</span>
    </label>
    <label class="space-y-1 text-sm">
      <span class="control-label">Screen distance</span>
      <input type="range" min="0.5" max="8" step="0.1" bind:value={screenDistanceM} class="w-full" />
      <span class="readout block font-mono text-xs">{screenDistanceM.toFixed(1)} m</span>
    </label>
  </section>

</main>
