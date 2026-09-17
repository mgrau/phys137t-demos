<script lang="ts">
  import { untrack } from 'svelte';
  import { render } from 'misty-states/render';
  import { parseCircuit, gateSpan } from 'misty-states/kernel';
  import type { QuantumStep, Measurement } from './quantum';

  let { source, steps, target, result, paused, resetKey, showStates, cursor = $bindable(0), moving = $bindable(false) }: {
    source: string;
    steps: QuantumStep[];
    target: number;
    result: Measurement | null;
    paused: boolean;
    resetKey: string;
    showStates: boolean;
    cursor: number;
    moving: boolean;
  } = $props();

  const NS = 'quantum-playback';
  const initialGlyphs = $derived([...steps[0].state].map((bit, i) => render(bit, {
    background: false, check: false, idPrefix: `${NS}-input-${i}`,
    shapeOrder: [i === 0 ? 'square' : 'circle'],
  })));
  // Native Misty gates, with space between rows for a travelling state. The
  // static input is omitted because the moving qubits ARE the input/output.
  const drawing = $derived.by(() => {
    const src = source.replace(/^in .*$/m, 'qubits 2').replace(/\bblank\b/g, 'I');
    const rendered = render(src, { background: false, check: false, idPrefix: NS, metrics: { gateGap: 64 } });
    const geometry = rendered.geometry!;
    const bounds = rendered.svg.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
    const top = Math.min(bounds[1], geometry.startY - 22);
    const bottom = Math.max(bounds[1] + bounds[3], geometry.endY + 25);
    const width = bounds[2];
    const height = bottom - top;
    const doc = parseCircuit(src);
    const masks = doc.layers.flatMap((layer, i) => layer.gates.flatMap((gate) => {
      if (gate.kind === 'identity') return [];
      const [first, last] = gateSpan(gate);
      const row = geometry.layers[i];
      return [{ x: geometry.columns[first - 1] - 27, y: row.y,
        width: geometry.columns[last - 1] - geometry.columns[first - 1] + 54, height: row.h }];
    }));
    // Only strip the outer SVG; all gate paths, gradients, and symbols remain
    // library-rendered. No simulated implementation is hidden behind the oracle.
    const artwork = rendered.svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
    const stops = steps.map(({ layer }, i) => {
      if (layer < 0) return geometry.startY;
      if (i === steps.length - 1) return geometry.endY;
      const row = geometry.layers[layer];
      return row.y + row.h + 32;
    });
    return { geometry, masks, artwork, stops, width, height, viewBox: `${bounds[0]} ${top} ${width} ${height}` };
  });

  $effect(() => {
    void source; void resetKey;
    cursor = 0;
    moving = false;
  });

  $effect(() => {
    void source; void resetKey;
    const destination = target;
    const from = untrack(() => cursor);
    moving = from !== destination;
    if (paused || from === destination) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cursor = destination;
      moving = false;
      return;
    }
    const direction = Math.sign(destination - from);
    let start: number | null = null;
    let frame = requestAnimationFrame(tick);
    function tick(now: number) {
      start ??= now;
      const distance = Math.min(Math.abs(destination - from), (now - start) / 700);
      cursor = from + direction * distance;
      if (distance === Math.abs(destination - from)) moving = false;
      else frame = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(frame);
  });

  const current = $derived(Math.min(steps.length - 1, Math.round(cursor)));
  const measuredComplete = $derived(cursor === steps.length - 1 && !moving && result !== null);
  const state = $derived(current === steps.length - 1 && result ? result.square + result.circle : steps[current].state);
  const basis = $derived(state.match(/^-?([01]{2})$/)?.[1]);
  const glyphs = $derived(basis ? [...basis].map((bit, i) => render(bit, {
    background: false, check: false, idPrefix: `${NS}-qubit-${i}`,
    shapeOrder: [i === 0 ? 'square' : 'circle'],
  })) : []);
  const cloud = $derived(!basis ? render(state, {
    background: false, check: false, idPrefix: `${NS}-cloud`, shapeOrder: ['square', 'circle'],
  }) : null);
  const cloudScale = $derived(cloud ? Math.min(1, 150 / cloud.width) : 1);
  const y = $derived.by(() => {
    const index = Math.min(drawing.stops.length - 1, Math.floor(cursor));
    const fraction = cursor - index;
    const eased = fraction * fraction * (3 - 2 * fraction);
    return drawing.stops[index] + ((drawing.stops[index + 1] ?? drawing.stops[index]) - drawing.stops[index]) * eased;
  });
  const middle = $derived((drawing.geometry.columns[0] + drawing.geometry.columns[1]) / 2);
  let svg: SVGSVGElement;

  function screenPoint(x: number, y: number) {
    const ctm = svg?.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(x, y).matrixTransform(ctm);
    return { x: point.x, y: point.y };
  }

  export function gatePoint(layer: number, wire: number) {
    const row = drawing.geometry.layers[layer];
    return row ? screenPoint(drawing.geometry.columns[wire], row.y + row.h / 2) : null;
  }

  export function inputPoint(wire: number) {
    return screenPoint(drawing.geometry.columns[wire], drawing.geometry.startY);
  }

  export function statePoint(layer: number) {
    const index = steps.findIndex((step) => step.layer === layer);
    return index < 0 ? null : screenPoint(middle, drawing.stops[index]);
  }
</script>

<svg bind:this={svg} viewBox={drawing.viewBox} width={drawing.width * 0.82} height={drawing.height * 0.82}
  role="img" aria-label={showStates
    ? 'Quantum circuit with moving square and circle qubits and a final detector for each qubit'
    : 'Quantum circuit showing the initial qubits and, after measurement, the final measured pair'}
  class="circuit-playback" data-state={showStates || measuredComplete ? state : steps[0].state} data-moving={moving}>
  <defs>
    <mask id={`${NS}-occlusion`} maskUnits="userSpaceOnUse" x="-200" y="-100" width="500" height={drawing.height + 200}>
      <rect x="-200" y="-100" width="500" height={drawing.height + 200} fill="white" />
      {#each drawing.masks as box}<rect {...box} rx="3" fill="black" />{/each}
    </mask>
  </defs>
  {@html drawing.artwork}
  {#if !showStates}
    <!-- Keep the prepared input visible as a stationary reference. -->
    <g class="initial-state">
      {#each initialGlyphs as glyph, i}
        <g transform={`translate(${drawing.geometry.columns[i] - glyph.width / 2} ${drawing.geometry.startY - glyph.height / 2})`}>
          {@html glyph.svg}
        </g>
      {/each}
    </g>
  {/if}
  <!-- Above the pipes, behind the gate faces; transparent everywhere else. -->
  {#if showStates || measuredComplete}
  <g mask={`url(#${NS}-occlusion)`} class="travelling-state">
    {#if basis}
      {#each glyphs as glyph, i}
        <g transform={`translate(${drawing.geometry.columns[i] - glyph.width / 2} ${y - glyph.height / 2})`}>
          {@html glyph.svg}
        </g>
      {/each}
    {:else if cloud}
      <g transform={`translate(${middle - cloud.width * cloudScale / 2} ${y - cloud.height * cloudScale / 2}) scale(${cloudScale})`}>
        {@html cloud.svg}
      </g>
    {/if}
  </g>
  {/if}
</svg>

<style>
  .circuit-playback { display: block; max-width: 100%; height: auto; overflow: visible; }
</style>
