<script lang="ts">
  /**
   * The ripple-tank view: plane waves arrive from the left, pass through the
   * slits, and spread as circular waves that interfere on the way to the
   * screen. This is the picture that makes the intensity curve believable, so
   * it is drawn from the actual superposition of two spherical waves rather
   * than from the far-field formula the screen uses.
   *
   * The field is drawn to an offscreen ImageData at a fixed low resolution and
   * scaled up. At full canvas resolution this is a per-pixel cos() per frame,
   * which drops a projector to single-digit frame rates.
   *
   * Photon traces are drawn on top afterwards, in full canvas coordinates, so
   * the lines stay crisp instead of inheriting the field's upscaling.
   */
  import { wavelengthToColour } from './physics';
  import { traceAlpha, type Trace } from './traces';

  interface Props {
    wavelengthNm: number;
    separationUm: number;
    slits: 1 | 2;
    running: boolean;
    /** 0 = wave picture fully visible, 1 = fully faded out. */
    fade?: number;
    traces?: Trace[];
    /** Bumped by the parent every frame so the fade advances. */
    now?: number;
  }

  let {
    wavelengthNm,
    separationUm,
    slits,
    running,
    fade = 0,
    traces = [],
    now = 0,
  }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  const W = 260;
  const H = 180;
  const SCALE = 3;

  // Screen-space geometry, in field pixels.
  const slitX = 70;
  // Visual wavelength, in field pixels. Deliberately not to scale: a real
  // 650 nm wave next to a 250 um slit gap would be far finer than one pixel.
  // Tied to the real wavelength only so the ripples visibly coarsen when the
  // slider moves, which is the point students should take from it.
  const visualLambda = $derived(4 + ((wavelengthNm - 380) / 400) * 10);
  const slitGap = $derived(6 + (separationUm / 500) * 60);

  let raf = 0;
  let phase = 0;
  /** The field is expensive, so it is cached and only redrawn when it moves. */
  let fieldCache: OffscreenCanvas | undefined;

  function renderField() {
    const img = new ImageData(W, H);
    const data = img.data;
    const k = (2 * Math.PI) / visualLambda;
    const mid = H / 2;
    const sources = slits === 2 ? [mid - slitGap / 2, mid + slitGap / 2] : [mid];
    const [cr, cg, cb] = wavelengthToColour(wavelengthNm).match(/\d+/g)!.map(Number);

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        let amp: number;
        if (px < slitX) {
          amp = Math.cos(k * px - phase);
        } else {
          // Superposition of one circular wave per slit. 1/sqrt(r) keeps the
          // energy sensible in 2D so the far field does not wash out.
          amp = 0;
          for (const sy of sources) {
            const r = Math.hypot(px - slitX, py - sy);
            amp += Math.cos(k * r - phase) / Math.sqrt(Math.max(r, 1));
          }
          amp *= slits === 2 ? 1.6 : 2.2;
        }
        // Squaring would show intensity, but the signed wave is what makes
        // cancellation legible — the dark lines are where crest meets trough,
        // and students should see both signs.
        const b = Math.min(1, Math.abs(amp) * 0.9);
        const i = (py * W + px) * 4;
        data[i] = cr * b;
        data[i + 1] = cg * b;
        data[i + 2] = cb * b;
        data[i + 3] = 255;
      }
    }

    // Opaque barrier with the slits cut out of it.
    for (let py = 0; py < H; py++) {
      if (sources.some((sy) => Math.abs(py - sy) < 2.5)) continue;
      for (let px = slitX - 2; px <= slitX + 1; px++) {
        const i = (py * W + px) * 4;
        data[i] = data[i + 1] = data[i + 2] = 60;
      }
    }

    const off = new OffscreenCanvas(W, H);
    off.getContext('2d')!.putImageData(img, 0, 0);
    fieldCache = off;
  }

  function drawTraces(ctx: CanvasRenderingContext2D, t: number) {
    if (!traces.length) return;
    const mid = (H / 2) * SCALE;
    const bx = slitX * SCALE;
    const gap = (slitGap / 2) * SCALE;
    const wallX = W * SCALE - 2;
    const slitYs = slits === 2 ? [mid - gap, mid + gap] : [mid];

    ctx.lineCap = 'round';
    for (const tr of traces) {
      const a = traceAlpha(tr, t);
      if (a <= 0) continue;
      // Map the landing position to the panel height. Proportional rather than
      // geometric: the field's ripple wavelength is not to scale, so its own
      // fringe angles do not match the real ones. The centre lines up and the
      // ordering is right, which is what the picture needs to carry.
      const landY = mid + tr.xNorm * (mid - 6 * SCALE);

      ctx.strokeStyle = `rgba(255,255,255,${0.72 * a})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      // Incoming, then split to every slit, then converge on where it landed.
      for (const sy of slitYs) {
        ctx.moveTo(0, mid);
        ctx.lineTo(bx, sy);
        ctx.moveTo(bx, sy);
        ctx.lineTo(wallX, landY);
      }
      ctx.stroke();

      // The landing spot itself.
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(wallX, landY, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'butt';
  }

  function paint(t: number) {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !fieldCache) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1 - fade;
    ctx.drawImage(fieldCache, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    drawTraces(ctx, t);
  }

  // Re-render the field when anything about it changes, including while paused.
  $effect(() => {
    void [wavelengthNm, separationUm, slits];
    renderField();
    paint(now || performance.now());
  });

  // Repaint on fade or trace changes without recomputing the field.
  $effect(() => {
    void [fade, traces, now];
    paint(now || performance.now());
  });

  // The wave animation. Traces fade on the parent's clock, so this loop is
  // only needed while the ripples are moving.
  $effect(() => {
    if (!running) return;
    const tick = (t: number) => {
      phase += 0.22;
      renderField();
      paint(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas
  bind:this={canvas}
  width={W * SCALE}
  height={H * SCALE}
  class="w-full rounded-lg bg-black"
  aria-label={traces.length
    ? 'Waves through the slits, with photon paths drawn through both slits at once, converging on where each photon landed'
    : 'Waves passing through the slits and interfering on the way to the screen'}
></canvas>
