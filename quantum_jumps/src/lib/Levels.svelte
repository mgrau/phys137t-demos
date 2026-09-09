<script lang="ts">
  /**
   * V-system energy level diagram for Hg⁺, matching the lecture slides:
   *   ²P₁/₂ (left, high)   ²S₁/₂ (centre, low)   ²D₅/₂ (right, mid)
   *
   * 194 nm: blue-violet.  282 nm: purple/violet.
   * Term symbols rendered with proper superscript/subscript sizing.
   */

  let {
    level,
    ionState,
    compact,
  }: {
    level: 'S' | 'D' | 'P';
    ionState: 'bright' | 'dark' | 'pulsing';
    compact: boolean;
  } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let w = $state(0);
  let h = $state(0);

  const FONT = 'system-ui, -apple-system, sans-serif';

  // Physics colours
  const COL_194 = { r: 129, g: 140, b: 248 }; // blue-violet #818CF8
  const COL_282 = { r: 192, g: 132, b: 252 }; // purple #C084FC

  function rgba(c: typeof COL_194, a: number) {
    return `rgba(${c.r},${c.g},${c.b},${a})`;
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
    const _lev = level;
    const _ion = ionState;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, w, h, _lev, _ion);
  });

  /** Draw a term symbol with proper super/subscript sizing, centred at (cx, baseY). */
  function drawTermSymbol(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    multiplicity: string,
    letter: string,
    jNum: string,
    mainFs: number,
    color: string,
  ) {
    const scriptFs = Math.round(mainFs * 0.58);
    ctx.fillStyle = color;

    // Measure widths to centre the whole symbol
    ctx.font = `${scriptFs}px ${FONT}`;
    const multW = ctx.measureText(multiplicity).width;
    ctx.font = `${mainFs}px ${FONT}`;
    const letterW = ctx.measureText(letter).width;
    ctx.font = `${scriptFs}px ${FONT}`;
    const jW = ctx.measureText(jNum).width;

    const totalW = multW + letterW + jW;
    let x = cx - totalW / 2;

    // Multiplicity — superscript
    ctx.font = `${scriptFs}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(multiplicity, x, baseY - mainFs * 0.3);
    x += multW;

    // Letter — baseline
    ctx.font = `${mainFs}px ${FONT}`;
    ctx.fillText(letter, x, baseY);
    x += letterW;

    // J value — subscript (e.g. "1/2" or "5/2")
    ctx.font = `${scriptFs}px ${FONT}`;
    ctx.fillText(jNum, x, baseY + mainFs * 0.18);
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    lev: string,
    ion: string,
  ) {
    ctx.clearRect(0, 0, w, h);

    const isPulsing = ion === 'pulsing';
    const isBright = ion === 'bright';

    // Font sizes
    const labelFs = Math.max(14, Math.min(20, w * 0.055));
    const subFs = Math.max(11, Math.min(15, w * 0.04));
    const wlFs = Math.max(12, Math.min(17, w * 0.045));
    const lineW = Math.min(w * 0.15, 80);
    const lineTh = 3.5;
    const arrowTh = 2.5;
    const headLen = 10;

    // Level positions — V-system: P left-high, S centre-low, D right-mid
    const pad = w * 0.12;
    const pX = pad + lineW / 2;
    const pY = h * 0.14;
    const sX = w * 0.5;
    const sY = h * 0.82;
    const dX = w - pad - lineW / 2;
    const dY = h * 0.32;

    // ── Level lines ──
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#505862';
    ctx.lineWidth = lineTh;
    for (const [x, y] of [
      [pX, pY],
      [sX, sY],
      [dX, dY],
    ] as [number, number][]) {
      ctx.beginPath();
      ctx.moveTo(x - lineW / 2, y);
      ctx.lineTo(x + lineW / 2, y);
      ctx.stroke();
    }

    // ── Term symbol labels above lines ──
    drawTermSymbol(ctx, pX, pY - 14, '2', 'P', '1/2', labelFs, '#B0B8C4');
    drawTermSymbol(ctx, sX, sY - 14, '2', 'S', '1/2', labelFs, '#B0B8C4');
    drawTermSymbol(ctx, dX, dY - 14, '2', 'D', '5/2', labelFs, '#B0B8C4');

    // ── Sublabels below lines ──
    if (!compact) {
      ctx.font = `${subFs}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#666E7A';
      ctx.fillText('excited', pX, pY + subFs + 8);
      ctx.fillText('ground', sX, sY + subFs + 8);
      ctx.fillText('metastable', dX, dY + subFs + 8);
    }

    // ── 194 nm transition (S ↔ P, blue-violet) ──
    const arrowInset = lineW * 0.35;
    const sp = {
      x1: sX - arrowInset,
      y1: sY - 6,
      x2: pX + arrowInset,
      y2: pY + 6,
    };
    const a194active = isBright;
    const a194alpha = a194active ? 0.75 : 0.18;
    drawArrow(
      ctx,
      sp.x1, sp.y1,
      sp.x2, sp.y2,
      rgba(COL_194, a194alpha),
      true,
      a194active ? arrowTh + 0.5 : arrowTh,
      headLen,
    );

    // 194 nm label — rotated to align with arrow, always readable
    let angle194 = Math.atan2(sp.y2 - sp.y1, sp.x2 - sp.x1);
    // Flip so text always reads left-to-right
    if (angle194 < -Math.PI / 2) angle194 += Math.PI;
    else if (angle194 > Math.PI / 2) angle194 -= Math.PI;
    const mid194x = (sp.x1 + sp.x2) / 2;
    const mid194y = (sp.y1 + sp.y2) / 2;
    ctx.save();
    ctx.translate(mid194x, mid194y);
    ctx.rotate(angle194);
    ctx.font = `${wlFs}px ${FONT}`;
    ctx.fillStyle = rgba(COL_194, a194active ? 0.8 : 0.25);
    ctx.textAlign = 'center';
    ctx.fillText('194 nm', 0, -12);
    ctx.restore();

    // ── 282 nm transition (S → D, purple) ──
    const sd = {
      x1: sX + arrowInset,
      y1: sY - 6,
      x2: dX - arrowInset,
      y2: dY + 6,
    };
    const a282active = isPulsing;
    const a282alpha = a282active ? 0.85 : 0.18;
    drawArrow(
      ctx,
      sd.x1, sd.y1,
      sd.x2, sd.y2,
      rgba(COL_282, a282alpha),
      false,
      a282active ? arrowTh + 1 : arrowTh,
      headLen,
    );

    // Glow on 282 when pulsing
    if (isPulsing) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = rgba(COL_282, 1);
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sd.x1, sd.y1);
      ctx.lineTo(sd.x2, sd.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 282 nm label — rotated along the arrow
    let angle282 = Math.atan2(sd.y2 - sd.y1, sd.x2 - sd.x1);
    if (angle282 < -Math.PI / 2) angle282 += Math.PI;
    else if (angle282 > Math.PI / 2) angle282 -= Math.PI;
    const mid282x = (sd.x1 + sd.x2) / 2;
    const mid282y = (sd.y1 + sd.y2) / 2;
    ctx.save();
    ctx.translate(mid282x, mid282y);
    ctx.rotate(angle282);
    ctx.font = `${wlFs}px ${FONT}`;
    ctx.fillStyle = rgba(COL_282, a282active ? 0.9 : 0.25);
    ctx.textAlign = 'center';
    ctx.fillText('282 nm', 0, -12);
    ctx.restore();

    // ── State indicator dot ──
    let dotX: number, dotY: number, dotColor: string;
    if (lev === 'P') {
      dotX = pX;
      dotY = pY;
      dotColor = rgba(COL_194, 1);
    } else if (lev === 'D') {
      dotX = dX;
      dotY = dY;
      dotColor = '#F06B8A';
    } else {
      dotX = sX;
      dotY = sY;
      dotColor = rgba(COL_194, 1);
    }

    const glow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 18);
    glow.addColorStop(0, dotColor.replace(/[\d.]+\)$/, '0.3)'));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(dotX - 22, dotY - 22, 44, 44);

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawArrow(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    color: string,
    doubleHeaded: boolean,
    lw: number,
    hl: number,
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Head at (x2, y2)
    const hw = hl * 0.55;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * hl - uy * hw, y2 - uy * hl + ux * hw);
    ctx.lineTo(x2 - ux * hl + uy * hw, y2 - uy * hl - ux * hw);
    ctx.closePath();
    ctx.fill();

    if (doubleHeaded) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + ux * hl - uy * hw, y1 + uy * hl + ux * hw);
      ctx.lineTo(x1 + ux * hl + uy * hw, y1 + uy * hl - ux * hw);
      ctx.closePath();
      ctx.fill();
    }
  }
</script>

<div bind:this={container} class="w-full h-full relative">
  <canvas
    bind:this={canvas}
    class="absolute inset-0"
    style="width:100%;height:100%"
  ></canvas>
</div>
