<script lang="ts">
  import {
    T_PI,
    T_MAX,
    pDark,
    snapDuration,
    PHOTON_THRESHOLD,
    PHOTON_HIST_MAX,
    type BinData,
  } from './physics';

  let {
    binMap,
    shotCount,
    photonHistogram,
    duration,
    onDurationChange,
    showTheory,
  }: {
    binMap: Map<number, BinData>;
    shotCount: number;
    photonHistogram: number[];
    duration: number;
    onDurationChange: (duration: number) => void;
    showTheory: boolean;
  } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let w = $state(0);
  let h = $state(0);
  let dragging = $state(false);

  const FONT = 'system-ui, -apple-system, sans-serif';
  const MONO = '"SF Mono","Cascadia Code","Fira Code","Consolas",monospace';

  function chartLayout(width: number, height: number) {
    const mobile = width < 640;
    const histogramHeight = mobile
      ? Math.min(116, Math.max(90, height * 0.23))
      : 128;
    return {
      mobile,
      histogramHeight,
      top: mobile ? histogramHeight + 28 : 28,
      right: mobile ? 12 : 18,
      bottom: mobile ? 48 : 52,
      left: mobile ? 56 : 60,
    };
  }

  $effect(() => {
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      w = r.width;
      h = r.height;
    });
    obs.observe(container);
    return () => obs.disconnect();
  });

  $effect(() => {
    if (!canvas || w === 0 || h === 0) return;
    const _sc = shotCount;
    const _dur = duration;
    const _th = showTheory;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, w, h, binMap, photonHistogram, _sc, _dur, _th);
  });

  // ── Drag interaction ──

  function xToDuration(mouseX: number): number {
    const layout = chartLayout(w, h);
    const pW = w - layout.left - layout.right;
    const t = ((mouseX - layout.left) / pW) * T_MAX;
    return snapDuration(Math.max(0, Math.min(T_MAX, t)));
  }

  function onPointerDown(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layout = chartLayout(w, h);
    if (
      x >= layout.left - 10 &&
      x <= w - layout.right + 10 &&
      y >= layout.top - 10 &&
      y <= h - layout.bottom + 10
    ) {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      onDurationChange(xToDuration(x));
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onDurationChange(xToDuration(x));
  }

  function onPointerUp() {
    dragging = false;
  }

  // ── Drawing ──

  function draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bins: Map<number, BinData>,
    photonCounts: number[],
    totalShots: number,
    dur: number,
    theory: boolean,
  ) {
    ctx.clearRect(0, 0, w, h);

    const M = chartLayout(w, h);
    const pW = w - M.left - M.right;
    const pH = h - M.top - M.bottom;

    function xS(t: number) {
      return M.left + (t / T_MAX) * pW;
    }
    function yS(p: number) {
      return M.top + (1 - p) * pH;
    }

    const axFs = Math.max(12, Math.min(15, w * 0.016));
    const titleFs = Math.max(13, Math.min(16, w * 0.017));
    const piFs = Math.max(11, Math.min(14, w * 0.015));

    // ── Horizontal grid ──
    ctx.strokeStyle = 'rgba(180,185,195,0.06)';
    ctx.lineWidth = 1;
    for (const p of [0.25, 0.5, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(M.left, yS(p));
      ctx.lineTo(M.left + pW, yS(p));
      ctx.stroke();
    }

    // ── π markers at top ──
    ctx.font = `${piFs}px ${FONT}`;
    ctx.fillStyle = 'rgba(180,185,195,0.4)';
    ctx.textAlign = 'center';
    for (let n = 1; n * T_PI <= T_MAX + 0.1; n++) {
      const xx = xS(n * T_PI);
      ctx.fillText(n === 1 ? 'π' : `${n}π`, xx, M.top - 9);
      ctx.strokeStyle = 'rgba(180,185,195,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xx, M.top);
      ctx.lineTo(xx, M.top + pH);
      ctx.stroke();
    }

    // ── Theory curve ──
    // Dashed rather than coloured: the measured points are the only thing on
    // this plot that came from the experiment, so the model is set apart by
    // line style instead of by hue.
    if (theory) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(200,208,220,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= pW; i++) {
        const t = (i / pW) * T_MAX;
        const x = M.left + i;
        const y = yS(pDark(t));
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── Current duration indicator (subtle dashed line, smooth) ──
    const cx = xS(dur);
    ctx.strokeStyle = 'rgba(160,165,175,0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, M.top);
    ctx.lineTo(cx, M.top + pH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small triangle marker at bottom
    ctx.fillStyle = 'rgba(160,165,175,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, M.top + pH);
    ctx.lineTo(cx - 4, M.top + pH + 6);
    ctx.lineTo(cx + 4, M.top + pH + 6);
    ctx.closePath();
    ctx.fill();

    // ── Data points + error bars ──
    bins.forEach((b, key) => {
      const total = b.bright + b.dark;
      if (total < 1) return;
      const avg = b.dark / total;
      const bx = xS(key);
      const by = yS(avg);

      // Error bar: σ = √(p̂(1−p̂)/n)
      if (total >= 2) {
        const sigma = Math.sqrt((avg * (1 - avg)) / total);
        const errTop = yS(Math.min(1, avg + sigma));
        const errBot = yS(Math.max(0, avg - sigma));
        ctx.strokeStyle = 'rgba(200,205,215,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, errTop);
        ctx.lineTo(bx, errBot);
        ctx.stroke();
        const capW = 4;
        ctx.beginPath();
        ctx.moveTo(bx - capW, errTop);
        ctx.lineTo(bx + capW, errTop);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx - capW, errBot);
        ctx.lineTo(bx + capW, errBot);
        ctx.stroke();
      }

      // Data dot
      const r = Math.min(5.5, 3 + Math.sqrt(total) * 0.15);
      ctx.fillStyle = '#C8CCD4';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,205,215,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // ── Axes ──
    ctx.strokeStyle = 'rgba(180,185,195,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left, M.top + pH);
    ctx.lineTo(M.left + pW, M.top + pH);
    ctx.stroke();

    // X ticks + labels
    ctx.fillStyle = '#858A94';
    ctx.font = `${axFs}px ${FONT}`;
    ctx.textAlign = 'center';
    for (let xt = 0; xt <= T_MAX; xt += 5) {
      const xp = xS(xt);
      ctx.strokeStyle = 'rgba(180,185,195,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xp, M.top + pH);
      ctx.lineTo(xp, M.top + pH + 5);
      ctx.stroke();
      ctx.fillText(xt.toString(), xp, M.top + pH + 20);
    }

    // X title
    ctx.font = `${titleFs}px ${FONT}`;
    ctx.fillText(
      '282 nm pulse duration (μs)',
      M.left + pW / 2,
      M.top + pH + 42,
    );

    // Y ticks + labels
    ctx.font = `${axFs}px ${FONT}`;
    ctx.textAlign = 'right';
    for (const [val, label] of [
      [0, '0'],
      [0.5, '0.5'],
      [1, '1'],
    ] as [number, string][]) {
      const yp = yS(val);
      ctx.strokeStyle = 'rgba(180,185,195,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(M.left - 5, yp);
      ctx.lineTo(M.left, yp);
      ctx.stroke();
      ctx.fillStyle = '#858A94';
      ctx.fillText(label, M.left - 10, yp + 5);
    }

    // Y title
    ctx.save();
    ctx.translate(16, M.top + pH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${titleFs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#858A94';
    ctx.fillText('Probability(dark)', 0, 0);
    ctx.restore();

    // ── Shot counter ──
    if (totalShots > 0) {
      ctx.font = `${Math.max(11, axFs)}px ${MONO}`;
      ctx.fillStyle = '#5A6070';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${totalShots.toLocaleString()} shots`,
        M.left + pW,
        M.top - 9,
      );
    }

    // ── Photon-count histogram ──
    if (M.mobile) {
      drawPhotonHistogram(
        ctx,
        8,
        7,
        w - 16,
        M.histogramHeight,
        photonCounts,
      );
    } else {
      drawPhotonHistogram(
        ctx,
        M.left + pW - 254,
        M.top + 9,
        246,
        128,
        photonCounts,
      );
    }

  }

  function drawPhotonHistogram(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    counts: number[],
  ) {
    ctx.fillStyle = 'rgba(18,20,24,0.92)';
    fillRoundRect(ctx, x, y, width, height, 5);
    ctx.strokeStyle = 'rgba(140,145,155,0.16)';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, x, y, width, height, 5);

    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#A4A9B3';
    ctx.fillText('Photon-count readout', x + 10, y + 17);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = '#5F6570';
    ctx.textAlign = 'right';
    ctx.fillText(`dark ≤ ${PHOTON_THRESHOLD}`, x + width - 10, y + 17);

    const plotX = x + 10;
    const plotY = y + 25;
    const plotW = width - 20;
    const plotH = height - 44;
    const barW = plotW / (PHOTON_HIST_MAX + 1);
    const maxCount = Math.max(1, ...counts);

    ctx.strokeStyle = 'rgba(180,185,195,0.18)';
    ctx.beginPath();
    ctx.moveTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    counts.forEach((count, i) => {
      if (count === 0) return;
      const barH = (count / maxCount) * (plotH - 4);
      ctx.fillStyle =
        i <= PHOTON_THRESHOLD
          ? 'rgba(240,107,138,0.72)'
          : 'rgba(129,140,248,0.72)';
      ctx.fillRect(
        plotX + i * barW + 0.4,
        plotY + plotH - barH,
        Math.max(1, barW - 0.8),
        barH,
      );
    });

    const thresholdX = plotX + (PHOTON_THRESHOLD + 1) * barW;
    ctx.strokeStyle = 'rgba(224,226,230,0.48)';
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(thresholdX, plotY);
    ctx.lineTo(thresholdX, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = '#5F6570';
    ctx.textAlign = 'center';
    for (const value of [0, 10, 20, 30, 40]) {
      const tickX = plotX + (value + 0.5) * barW;
      ctx.fillText(
        value === PHOTON_HIST_MAX ? '≥40' : value.toString(),
        tickX,
        y + height - 7,
      );
    }
  }

  function fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function strokeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
  }
</script>

<div bind:this={container} class="w-full h-full relative">
  <canvas
    bind:this={canvas}
    class="absolute inset-0"
    style="width:100%;height:100%;cursor:col-resize;"
    aria-label="Rabi oscillation data and photon-count histogram"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
  ></canvas>
</div>
