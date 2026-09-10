<script lang="ts">
  /**
   * A misty source rendered to SVG, optionally tappable.
   *
   * Every instance needs its own `idPrefix`. The emitted SVG refers to its
   * gradients by id — `url(#ms-pipe)` — so two figures inlined on one page with
   * the same prefix collide and the second silently repaints with the first's
   * fills. A table of answer cells is exactly that case.
   *
   * These never follow the theme. White and black are what a qubit's value
   * *is*, so inverting them would change the meaning rather than the styling.
   * See `--paper` in app.css for the ground they sit on.
   */
  import { render } from 'misty-states/render';
  import type { QubitSpot } from 'misty-states/kernel';

  let {
    source,
    idPrefix,
    scale = 1,
    shapeOrder,
    onQubitTap,
    onQubitGrab,
    ariaLabel,
  }: {
    source: string;
    idPrefix: string;
    scale?: number;
    /** Register shapes from the question, so a cell matches its circuit. */
    shapeOrder?: string[];
    /** Given the source offset of the tapped qubit. */
    onQubitTap?: (spot: QubitSpot) => void;
    /** Pointer went down on a qubit — start of a possible drag. */
    onQubitGrab?: (spot: QubitSpot, e: PointerEvent) => void;
    ariaLabel?: string;
  } = $props();

  let host: HTMLDivElement;
  let spots: QubitSpot[] = [];

  $effect(() => {
    const src = source;
    const order = shapeOrder;
    if (!host) return;
    // `check: false` skips a simulation we never look at — the quiz does its own
    // marking, and this runs on every keystroke.
    const result = render(src || ' ', {
      idPrefix,
      scale,
      // Never misty's dark palette. It swaps the fills — a white qubit comes
      // back near-black — and in this notation the fill *is* the value, so a
      // dark theme would show students the wrong bit. The figures keep the
      // light palette in both themes and sit on light paper instead.
      background: false,
      check: false,
      ...(order ? { shapeOrder: order as never } : {}),
    });
    host.innerHTML = result.svg;
    spots = result.qubitSpots ?? [];
  });

  /** Screen point -> diagram coordinates, so spot hit-boxes are comparable. */
  function toDiagram(e: PointerEvent): { x: number; y: number } | null {
    const svg = host?.querySelector('svg');
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** The qubit whose box contains this event, if any. */
  function spotUnder(e: PointerEvent): QubitSpot | null {
    const p = toDiagram(e);
    if (!p) return null;
    for (const s of spots) {
      const r = s.size / 2;
      if (Math.abs(p.x - s.cx) <= r && Math.abs(p.y - s.cy) <= r) return s;
    }
    return null;
  }

  function onPointerUp(e: PointerEvent) {
    if (!onQubitTap || onQubitGrab) return;
    const s = spotUnder(e);
    if (s) onQubitTap(s);
  }

  function onPointerDown(e: PointerEvent) {
    if (!onQubitGrab) return;
    const s = spotUnder(e);
    if (s) onQubitGrab(s, e);
  }

  /**
   * The box enclosing a set of qubits, relative to this figure's own box.
   *
   * Used to highlight one written term during the walk-through. Computed from
   * the rendered spots through the SVG's CTM rather than from the DOM, because
   * the qubit glyphs are paths without stable identity — spots carry the source
   * offset, which is the only thing that says which term a glyph belongs to.
   */
  export function boxFor(ats: number[]):
    | { left: number; top: number; width: number; height: number }
    | null {
    const svg = host?.querySelector('svg');
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const frame = host.getBoundingClientRect();
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    for (const s of spots) {
      if (!ats.includes(s.at)) continue;
      const h = s.size / 2;
      for (const [dx, dy] of [
        [-h, -h],
        [h, h],
      ]) {
        const pt = new DOMPoint(s.cx + dx, s.cy + dy).matrixTransform(ctm);
        l = Math.min(l, pt.x);
        r = Math.max(r, pt.x);
        t = Math.min(t, pt.y);
        b = Math.max(b, pt.y);
      }
    }
    if (l === Infinity) return null;
    return { left: l - frame.left, top: t - frame.top, width: r - l, height: b - t };
  }

  /**
   * The qubit at a screen point, for a parent resolving a drop.
   *
   * A sign belongs to a *term*, so dropping a minus has to know which term it
   * landed on, and the only thing that identifies one is the qubits in it.
   */
  export function hitTest(clientX: number, clientY: number): QubitSpot | null {
    const svg = host?.querySelector('svg');
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    for (const s of spots) {
      const r = s.size / 2;
      if (Math.abs(p.x - s.cx) <= r && Math.abs(p.y - s.cy) <= r) return s;
    }
    return null;
  }
</script>

<div
  bind:this={host}
  class="figure"
  class:interactive={!!(onQubitTap || onQubitGrab)}
  role={onQubitTap || onQubitGrab ? 'group' : 'img'}
  aria-label={ariaLabel}
  onpointerup={onQubitTap && !onQubitGrab ? onPointerUp : undefined}
  onpointerdown={onQubitGrab ? onPointerDown : undefined}
></div>

<style>
  .figure :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .interactive {
    touch-action: none;
  }
</style>
