<script lang="ts">
  /**
   * What lands on the wall.
   *
   * Wave mode draws the intensity curve and a glowing band, which is what the
   * laser demo looks like. Particle mode fires one object at a time, marks
   * where each one hit, and builds a histogram that converges to the same
   * curve. The curve stays faintly visible in particle mode on purpose: the
   * histogram growing into it is the whole argument of the lecture.
   */
  import { intensity, PatternSampler, wavelengthToColour, type Params } from './physics';

  interface Props {
    params: Params;
    halfWidth: number;
    mode: 'wave' | 'particles';
    running: boolean;
    rate: number;
    /** Bumping this clears the accumulated hits. */
    resetKey: number;
    onCount?: (n: number) => void;
    /** Called once per photon with its landing position, normalised to [-1, 1]. */
    onPhoton?: (xNorm: number) => void;
  }

  let { params, halfWidth, mode, running, rate, resetKey, onCount, onPhoton }:
    Props = $props();

  const BINS = 140;
  let canvas: HTMLCanvasElement | undefined = $state();
  const W = 900;
  const H = 320;

  let hist = $state(new Float64Array(BINS));
  let total = $state(0);
  /** Recent hits, drawn as individual marks so single events are visible. */
  let recent: { x: number; y: number; age: number }[] = [];

  const sampler = $derived(new PatternSampler(params, halfWidth));
  const colour = $derived(wavelengthToColour(params.wavelength * 1e9));

  // Clearing has to react to resetKey, and to anything that changes the
  // pattern: a histogram accumulated under one slit separation is not evidence
  // about another one.
  $effect(() => {
    void [resetKey, params.wavelength, params.separation, params.slitWidth,
          params.slits, params.screenDistance, halfWidth];
    hist = new Float64Array(BINS);
    total = 0;
    recent = [];
    onCount?.(0);
  });

  function fire(n: number) {
    for (let i = 0; i < n; i++) {
      const x = sampler.sample();
      const b = Math.floor(((x + halfWidth) / (2 * halfWidth)) * BINS);
      if (b < 0 || b >= BINS) continue;
      hist[b] += 1;
      total += 1;
      if (recent.length < 400) {
        recent.push({ x, y: Math.random(), age: 0 });
      }
      onPhoton?.(x / halfWidth);
    }
    onCount?.(total);
  }

  function draw() {
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const toPx = (x: number) => ((x + halfWidth) / (2 * halfWidth)) * W;
    const bandTop = 12;
    const bandH = 54;
    const plotTop = bandTop + bandH + 18;
    const plotH = H - plotTop - 26;

    // The glowing band on the wall.
    const bandAlpha = mode === 'wave' ? 1 : 0.28;
    for (let px = 0; px < W; px++) {
      const x = -halfWidth + (2 * halfWidth * px) / W;
      const I = intensity(x, params);
      ctx.globalAlpha = bandAlpha * Math.min(1, I * 1.05);
      ctx.fillStyle = colour;
      ctx.fillRect(px, bandTop, 1, bandH);
    }
    ctx.globalAlpha = 1;

    // The analytic intensity curve.
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
      const x = -halfWidth + (2 * halfWidth * px) / W;
      const y = plotTop + plotH - intensity(x, params) * plotH;
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = mode === 'wave' ? colour : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = mode === 'wave' ? 2.5 : 1.5;
    if (mode === 'particles') ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (mode === 'particles') {
      // Histogram, scaled so its tallest column reaches the top of the plot.
      const peak = Math.max(1, ...hist);
      const bw = W / BINS;
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.85;
      for (let b = 0; b < BINS; b++) {
        const h = (hist[b] / peak) * plotH;
        ctx.fillRect(b * bw + 0.5, plotTop + plotH - h, bw - 1, h);
      }
      ctx.globalAlpha = 1;

      // Individual recent hits on the band, so one particle at a time reads as
      // one particle at a time rather than as a bar chart ticking up.
      for (const h of recent) {
        ctx.globalAlpha = Math.max(0, 1 - h.age / 90);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(toPx(h.x), bandTop + 6 + h.y * (bandH - 12), 1.8, 0, Math.PI * 2);
        ctx.fill();
        h.age += 1;
      }
      recent = recent.filter((h) => h.age < 90);
      ctx.globalAlpha = 1;
    }

    // Baseline and a centre tick.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, plotTop + plotH);
    ctx.lineTo(W, plotTop + plotH);
    ctx.stroke();

    // Millimetre scale.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const mmHalf = halfWidth * 1000;
    const stepMm = mmHalf > 40 ? 20 : mmHalf > 16 ? 10 : mmHalf > 8 ? 5 : 2;
    for (let mm = -Math.floor(mmHalf / stepMm) * stepMm; mm <= mmHalf; mm += stepMm) {
      const px = toPx(mm / 1000);
      ctx.fillRect(px, plotTop + plotH, 1, 4);
      ctx.fillText(`${mm}`, px, plotTop + plotH + 18);
    }
    ctx.textAlign = 'left';
    ctx.fillText('mm on the screen', 6, H - 4);
  }

  let raf = 0;
  let carry = 0;
  let last = 0;

  $effect(() => {
    void [params, halfWidth, mode, hist, total];
    draw();
  });

  $effect(() => {
    if (!running) return;
    last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (mode === 'particles') {
        // Accumulate fractional particles so a rate of 2/s does not round to
        // zero every frame.
        carry += rate * dt;
        const n = Math.floor(carry);
        if (n > 0) {
          carry -= n;
          fire(n);
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  export function fireOne() {
    fire(1);
  }
</script>

<canvas
  bind:this={canvas}
  width={W}
  height={H}
  class="w-full rounded-lg bg-neutral-950"
  aria-label={mode === 'wave'
    ? 'The interference pattern on the screen, drawn as a continuous intensity curve'
    : `A histogram of where ${total} individual photons landed, converging on the same interference pattern`}
></canvas>
