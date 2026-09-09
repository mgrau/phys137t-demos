<script lang="ts">
  import WaveField from './lib/WaveField.svelte';
  import Screen from './lib/Screen.svelte';
  import { envelopeHalfAngle, type Params } from './lib/physics';
  import { addTrace, pruneTraces, type Trace } from './lib/traces';

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
</script>

<main class="demo-shell mx-auto max-w-5xl space-y-4 p-3 text-neutral-100 sm:p-5">
  <header class="space-y-1">
    <h1 class="text-2xl font-semibold tracking-tight">
      Interference: waves, then one photon at a time
    </h1>
    <p class="text-sm text-neutral-400">
      PHYS 137T &middot; Lecture 4. Move the sliders and see what changes. Then
      switch to one photon at a time &mdash; what stays the same?
    </p>
  </header>

  <section class="grid gap-4 md:grid-cols-[1fr_2fr]">
    <div class="space-y-2">
      <h2 class="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {slits === 2 ? 'Two slits' : 'One slit'}
      </h2>
      <WaveField
        {wavelengthNm}
        {separationUm}
        {slits}
        running={running && mode === 'wave'}
        fade={mode === 'particles' ? 0.7 : 0}
        traces={mode === 'particles' ? traces : []}
        now={clock}
      />
      {#if mode === 'particles'}
        <p class="text-xs text-neutral-500">
          Each photon is drawn through <strong>both</strong> slits at once,
          meeting at the spot where it landed.
        </p>
      {/if}
    </div>

    <div class="space-y-2">
      <h2 class="text-xs font-medium uppercase tracking-wide text-neutral-400">
        The screen
        {#if mode === 'particles'}
          <span class="ml-2 font-mono text-neutral-200">{count.toLocaleString()} hits</span>
        {/if}
      </h2>
      <Screen bind:this={screen} {params} {halfWidth} {mode} {running} {rate} {resetKey}
              onCount={(n) => (count = n)} {onPhoton} />
    </div>
  </section>

  <section class="demo-panel flex flex-wrap items-center gap-2 rounded-lg bg-neutral-900 p-3">
    <button
      class="rounded-md px-3 py-1.5 text-sm font-medium transition
             {mode === 'wave' ? 'bg-[#E6E8EC] text-[#111215]' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
      onclick={() => (mode = 'wave')}
    >
      Waves
    </button>
    <button
      class="rounded-md px-3 py-1.5 text-sm font-medium transition
             {mode === 'particles' ? 'bg-[#E6E8EC] text-[#111215]' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
      onclick={toParticles}
    >
      One Photon at a Time
    </button>

    <div class="mx-1 h-6 w-px bg-neutral-700"></div>

    <button
      class="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      onclick={() => (running = !running)}
    >
      {running ? 'Pause' : 'Play'}
    </button>

    {#if mode === 'particles'}
      <button
        class="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
        onclick={() => screen?.fireOne()}
      >
        Fire one
      </button>
      <label class="flex items-center gap-2 text-sm text-neutral-300">
        rate
        <input type="range" min="1" max="600" step="1" bind:value={rate} class="w-28" />
        <span class="w-16 font-mono text-xs text-neutral-400">{rate}/s</span>
      </label>
    {/if}

    <button
      class="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      onclick={reset}
    >
      Clear
    </button>

    <div class="mx-1 h-6 w-px bg-neutral-700"></div>

    <button
      class="rounded-md px-3 py-1.5 text-sm transition
             {slits === 1 ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
      onclick={() => (slits = slits === 1 ? 2 : 1)}
    >
      {slits === 1 ? 'One slit' : 'Two slits'}
    </button>
  </section>

  <section class="demo-panel grid gap-4 rounded-lg bg-neutral-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
    <label class="space-y-1 text-sm">
      <span class="text-neutral-300">Wavelength</span>
      <input type="range" min="380" max="750" step="1" bind:value={wavelengthNm} class="w-full" />
      <span class="block font-mono text-xs text-neutral-400">{wavelengthNm} nm</span>
    </label>
    <label class="space-y-1 text-sm">
      <span class="text-neutral-300">Slit width</span>
      <input type="range" min="20" max="300" step="5" bind:value={slitWidthUm} class="w-full" />
      <span class="block font-mono text-xs text-neutral-400">{slitWidthUm} &micro;m</span>
    </label>
    <label class="space-y-1 text-sm {slits === 1 ? 'opacity-40' : ''}">
      <span class="text-neutral-300">Slit separation</span>
      <input type="range" min="60" max="800" step="10" bind:value={separationUm}
             disabled={slits === 1} class="w-full" />
      <span class="block font-mono text-xs text-neutral-400">{separationUm} &micro;m</span>
    </label>
    <label class="space-y-1 text-sm">
      <span class="text-neutral-300">Screen distance</span>
      <input type="range" min="0.5" max="8" step="0.1" bind:value={screenDistanceM} class="w-full" />
      <span class="block font-mono text-xs text-neutral-400">{screenDistanceM.toFixed(1)} m</span>
    </label>
  </section>

</main>
