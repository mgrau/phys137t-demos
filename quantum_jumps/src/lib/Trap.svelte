<script lang="ts">
  /**
   * 3D perspective drawing of a Paul ring trap, matching the style from
   * the PHYS 137T lecture slides (Bergquist et al. 1986).
   *
   * 194 nm beam: blue-violet. 282 nm beam: purple/violet.
   * Ion fluorescence: blue-violet (emits near 194 nm).
   *
   * Every colour comes from the palette, so the hardware drawing follows the
   * theme. The beams and the fluorescence keep their identity across themes;
   * only the metal, the bore and the ion's core are re-grounded.
   */

  import { theme, type Palette } from './theme.svelte';

  let {
    ionState,
    compact,
  }: {
    ionState: 'bright' | 'dark' | 'pulsing';
    compact: boolean;
  } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let w = $state(0);
  let h = $state(0);

  const FONT = 'system-ui, -apple-system, sans-serif';
  const MONO = '"SF Mono","Cascadia Code","Fira Code","Consolas",monospace';

  // Fixed fluorescence photon positions
  const PHOTONS = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.37;
    const dist = 0.3 + (i % 6) * 0.08;
    return { angle, dist, alpha: 0.12 + (i % 5) * 0.08 };
  });

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
    const _ion = ionState;
    // Reading the palette here is what makes the canvas redraw on a theme flip:
    // it is $state underneath, so this effect depends on it.
    const p = theme.palette;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, w, h, _ion, p);
  });

  function draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ion: string,
    p: Palette,
  ) {
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.46;
    const sc = Math.min(w * 0.42, h * 0.42);
    // The slide views the electrode faces obliquely, but they are not nearly
    // edge-on. A broader minor axis gives the washer the correct depth.
    const persp = 0.56;
    const tilt = Math.PI / 4;

    function enterTrapSpace() {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.translate(-cx, -cy);
    }

    function trapPoint(x: number, y: number) {
      const dx = x - cx;
      const dy = y - cy;
      return {
        x: cx + dx * Math.cos(tilt) - dy * Math.sin(tilt),
        y: cy + dx * Math.sin(tilt) + dy * Math.cos(tilt),
      };
    }

    // Ring (torus) geometry
    const ringOuterR = sc * 0.9;
    const ringInnerR = sc * 0.38;
    const tubeDepth = sc * 0.18;

    // Endcap geometry
    const capRX = sc * 0.28;
    const capH = sc * 0.68;
    const capDist = sc * 0.58;
    const capPersp = persp;

    // The electrode axis runs from lower left to upper right, as in Lecture 05.
    // Rotate only the trap hardware so the laser still crosses horizontally.
    enterTrapSpace();

    // ── 1. Far electrode: lower-left endcap ──
    drawCylinder(ctx, cx, cy + capDist, capRX, capH, capPersp, p);

    // ── 2. Rear face of the thick washer ──
    ctx.fillStyle = p.trap.cavity;
    ctx.beginPath();
    ctx.ellipse(cx, cy + tubeDepth, ringOuterR, ringOuterR * persp, 0, 0, Math.PI * 2);
    ctx.ellipse(
      cx,
      cy + tubeDepth,
      ringInnerR,
      ringInnerR * persp,
      0,
      Math.PI * 2,
      0,
    );
    ctx.closePath();
    ctx.fill('evenodd');

    // Inner wall: connect the near half of the front opening to the rear
    // opening while leaving the centre transparent.
    ctx.fillStyle = p.trap.cavityInner;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      ringInnerR,
      ringInnerR * persp,
      0,
      0,
      Math.PI,
    );
    ctx.lineTo(cx - ringInnerR, cy + tubeDepth);
    ctx.ellipse(
      cx,
      cy + tubeDepth,
      ringInnerR,
      ringInnerR * persp,
      0,
      Math.PI,
      0,
      true,
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ── 3. Beams ──
    const beamLen = ringOuterR * 1.3;

    // 194 nm detection beam (blue-violet, always visible)
    const beamAlpha = ion === 'bright' ? 0.5 : 0.15;
    const b194 = ctx.createLinearGradient(cx - beamLen, cy, cx + beamLen, cy);
    b194.addColorStop(0, p.alpha(p.c194, 0));
    b194.addColorStop(0.2, p.alpha(p.c194, beamAlpha * 0.6));
    b194.addColorStop(0.5, p.alpha(p.c194, beamAlpha));
    b194.addColorStop(0.8, p.alpha(p.c194, beamAlpha * 0.6));
    b194.addColorStop(1, p.alpha(p.c194, 0));
    ctx.fillStyle = b194;
    ctx.fillRect(cx - beamLen, cy - 2, beamLen * 2, 4);

    // 282 nm shelving beam (purple, only when pulsing)
    if (ion === 'pulsing') {
      const b282 = ctx.createLinearGradient(cx - beamLen, cy, cx + beamLen, cy);
      b282.addColorStop(0, p.alpha(p.c282, 0));
      b282.addColorStop(0.25, p.alpha(p.c282, 0.35));
      b282.addColorStop(0.5, p.alpha(p.c282, 0.55));
      b282.addColorStop(0.75, p.alpha(p.c282, 0.35));
      b282.addColorStop(1, p.alpha(p.c282, 0));
      ctx.fillStyle = b282;
      ctx.fillRect(cx - beamLen, cy - 3.5, beamLen * 2, 7);
    }

    // ── 4. Ion ──
    const ionR = sc * 0.06;
    if (ion === 'bright') {
      // Blue-violet fluorescence glow
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, ionR * 5);
      g1.addColorStop(0, p.alpha(p.c194, 0.35));
      g1.addColorStop(1, p.alpha(p.c194, 0));
      ctx.fillStyle = g1;
      ctx.fillRect(cx - ionR * 6, cy - ionR * 6, ionR * 12, ionR * 12);
      for (const ph of PHOTONS) {
        const px = cx + Math.cos(ph.angle) * ionR * ph.dist * 12;
        const py = cy + Math.sin(ph.angle) * ionR * ph.dist * 10;
        ctx.fillStyle = p.alpha(p.c194, ph.alpha);
        ctx.beginPath();
        ctx.arc(px, py, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, ionR);
      // The core is white-hot on dark, but white washes out on a light ground,
      // so there the palette makes it saturated instead. See `ionCore`.
      g2.addColorStop(0, p.trap.ionCore);
      g2.addColorStop(0.4, p.alpha(p.c194, 0.5));
      g2.addColorStop(1, p.alpha(p.c194, 0));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(cx, cy, ionR, 0, Math.PI * 2);
      ctx.fill();
    } else if (ion === 'pulsing') {
      // Purple glow (282 nm active)
      const gp = ctx.createRadialGradient(cx, cy, 0, cx, cy, ionR * 2.5);
      gp.addColorStop(0, p.alpha(p.c282, 0.5));
      gp.addColorStop(1, p.alpha(p.c282, 0));
      ctx.fillStyle = gp;
      ctx.beginPath();
      ctx.arc(cx, cy, ionR * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.alpha(p.c282, 0.6);
      ctx.beginPath();
      ctx.arc(cx, cy, ionR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Dark — dim
      ctx.fillStyle = p.alpha(p.data, 0.15);
      ctx.beginPath();
      ctx.arc(cx, cy, ionR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.textFaint;
      ctx.beginPath();
      ctx.arc(cx, cy, ionR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 5. Ring front surface (annulus with hole) ──
    enterTrapSpace();
    const ringGrad = ctx.createLinearGradient(cx - ringOuterR, cy, cx + ringOuterR, cy);
    ringGrad.addColorStop(0, p.trap.metalEdge);
    ringGrad.addColorStop(0.2, p.trap.metalMid);
    ringGrad.addColorStop(0.4, p.trap.metalCore);
    ringGrad.addColorStop(0.6, p.trap.metalCore);
    ringGrad.addColorStop(0.8, p.trap.metalMid);
    ringGrad.addColorStop(1, p.trap.metalEdge);
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringOuterR, ringOuterR * persp, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy, ringInnerR, ringInnerR * persp, 0, Math.PI * 2, 0);
    ctx.closePath();
    ctx.fill('evenodd');

    // Subtle edge strokes
    ctx.strokeStyle = p.trap.metalStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringOuterR, ringOuterR * persp, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringInnerR, ringInnerR * persp, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── 6. Near electrode: upper-right endcap ──
    // It is deliberately painted after the complete ring so their overlap
    // reads, back to front: left endcap → ring → right endcap.
    drawCylinder(ctx, cx, cy - capDist, capRX, capH, capPersp, p);

    ctx.restore();

    // ── 7. Labels ──
    const fs = Math.max(12, Math.min(15, sc * 0.11));
    ctx.font = `${fs}px ${FONT}`;
    ctx.fillStyle = p.trap.label;
    ctx.textAlign = 'center';
    const ringLabel = trapPoint(
      cx + ringOuterR * 0.72,
      cy + ringOuterR * persp + fs + 4,
    );
    const upperCapLabel = trapPoint(
      cx,
      cy - capDist - capH / 2 - capRX * capPersp - 5,
    );
    const lowerCapLabel = trapPoint(
      cx,
      cy + capDist + capH / 2 + capRX * capPersp + fs + 2,
    );
    if (!compact) {
      drawClampedLabel('ring RF electrode', ringLabel.x, ringLabel.y);
      drawClampedLabel('endcap DC electrode', upperCapLabel.x, upperCapLabel.y);
      drawClampedLabel('endcap DC electrode', lowerCapLabel.x, lowerCapLabel.y);
    }

    // Ion label
    ctx.fillStyle = p.trap.label;
    ctx.font = `${fs}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('Hg⁺', cx - ionR * 1.15, cy + fs * 0.35);

    // Status
    const statusFs = Math.max(13, Math.min(16, sc * 0.12));
    ctx.font = `${statusFs}px ${MONO}`;
    ctx.textAlign = 'center';
    if (ion === 'pulsing') {
      ctx.fillStyle = p.alpha(p.c282, 0.85);
      ctx.fillText('SHELVING', cx, h - 8);
    } else if (ion === 'bright') {
      ctx.fillStyle = p.alpha(p.c194, 0.85);
      ctx.fillText('BRIGHT', cx, h - 8);
    } else {
      ctx.fillStyle = p.darkState;
      ctx.fillText('DARK', cx, h - 8);
    }

    function drawClampedLabel(text: string, x: number, y: number) {
      const halfWidth = ctx.measureText(text).width / 2;
      const safeX = Math.max(halfWidth + 8, Math.min(w - halfWidth - 8, x));
      ctx.fillText(text, safeX, y);
    }
  }

  function drawCylinder(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    h: number,
    persp: number,
    p: Palette,
  ) {
    const ry = rx * persp;
    const topY = cy - h / 2;
    const botY = cy + h / 2;

    const bodyGrad = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    bodyGrad.addColorStop(0, p.trap.metalEdge);
    bodyGrad.addColorStop(0.3, p.trap.metalMid);
    bodyGrad.addColorStop(0.5, p.trap.metalCore);
    bodyGrad.addColorStop(0.7, p.trap.metalMid);
    bodyGrad.addColorStop(1, p.trap.metalEdge);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, topY, rx, ry, 0, Math.PI, 0, false);
    ctx.lineTo(cx + rx, botY);
    ctx.ellipse(cx, botY, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    // From this viewing direction only the top circular face is visible.
    const faceY = topY;
    const faceGrad = ctx.createRadialGradient(cx, faceY, 0, cx, faceY, rx);
    faceGrad.addColorStop(0, p.trap.metalMid);
    faceGrad.addColorStop(1, p.trap.metalEdge);
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.trap.metalStroke;
    ctx.lineWidth = 1;
    ctx.stroke();

  }
</script>

<div bind:this={container} class="w-full h-full relative">
  <canvas
    bind:this={canvas}
    class="absolute inset-0"
    style="width:100%;height:100%"
  ></canvas>
</div>
