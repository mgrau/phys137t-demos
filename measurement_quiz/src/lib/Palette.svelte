<script lang="ts">
  /**
   * The blocks an answer is built from: every shape in the register, in white
   * and in black, plus a cloud to start another possibility.
   *
   * A shape is not decoration here — it names *which* qubit. So each tile knows
   * its slot, and dropping it fills that slot whatever else is already there.
   * Tiles for slots the newest possibility has already filled stay enabled: a
   * second drop on a filled slot is how a student says "and another
   * possibility, differing here", which is what makes an amplitude.
   */
  import Figure from './Figure.svelte';
  import type { Tile } from './carry.svelte';

  let {
    shapes,
    open,
    onTap,
    onGrab,
  }: {
    /** Register shapes in order, from the question. */
    shapes: string[];
    /** Which slots the newest possibility still has free. */
    open: boolean[];
    onTap: (tile: Tile) => void;
    onGrab: (tile: Tile, e: PointerEvent) => void;
  } = $props();

  /** shapeOrder rotated so slot `k`'s glyph is what gets drawn. */
  const rotate = (k: number) => [...shapes.slice(k), ...shapes.slice(0, k)];

  const NAMES: Record<string, string> = {
    circle: 'circle',
    square: 'square',
    triangle: 'triangle',
    diamond: 'diamond',
  };
</script>

<div class="palette">
  <span class="plabel">Drag in</span>

  <div class="groups">
    {#each shapes as shape, k}
      <div class="group" class:filled={!open[k]}>
        {#each [0, 1] as const as value}
          <button
            class="tile"
            onpointerdown={(e) => onGrab({ kind: 'qubit', slot: k, value }, e)}
            onclick={() => onTap({ kind: 'qubit', slot: k, value })}
            aria-label={`A ${value === 0 ? 'white' : 'black'} ${NAMES[shape] ?? shape}`}
            title={open[k]
              ? `Place the ${NAMES[shape] ?? shape}`
              : `The ${NAMES[shape] ?? shape} is already set — this starts another possibility`}
          >
            <Figure
              source={String(value)}
              idPrefix={`pal-${k}-${value}`}
              scale={0.72}
              shapeOrder={rotate(k)}
            />
          </button>
        {/each}
      </div>
    {/each}
  </div>

  <span class="sep" aria-hidden="true"></span>

  <button
    class="tile wide"
    onpointerdown={(e) => onGrab({ kind: 'cloud' }, e)}
    onclick={() => onTap({ kind: 'cloud' })}
    title="Another possibility, to build inside the cloud"
    aria-label="Another possibility"
  >
    <Figure source="(?)" idPrefix="pal-cloud" scale={0.6} shapeOrder={shapes} />
  </button>

  <button
    class="tile wide minus"
    onpointerdown={(e) => onGrab({ kind: 'minus' }, e)}
    title="Drop on a term inside a cloud to make its amplitude negative"
    aria-label="A minus sign"
  >
    &minus;
  </button>
</div>

<style>
  .palette {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .plabel {
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .groups {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* One shape's pair, boxed so the white/black pair reads as one qubit. */
  .group {
    display: flex;
    gap: 3px;
    padding: 3px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
  }
  /* Already placed in the newest possibility — still usable, and doing so
     starts another one. */
  .group.filled {
    border-style: dashed;
    opacity: 0.72;
  }

  .sep {
    width: 1px;
    height: 24px;
    background: var(--line);
  }

  /* Paper, not panel: these hold notation, which keeps its light palette in
     both themes because a qubit's fill is its value. */
  .tile {
    display: grid;
    place-items: center;
    min-width: 38px;
    min-height: 38px;
    padding: 3px;
    font: inherit;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: 7px;
    cursor: grab;
    touch-action: none;
  }
  .tile:hover {
    border-color: var(--fill);
  }
  .tile:active {
    cursor: grabbing;
  }
  .tile.wide {
    min-width: 46px;
    min-height: 42px;
  }

  /* A sign is not notation you place, it is an operation on a term, so this one
     is chrome rather than paper. */
  .tile.minus {
    font-size: 1.3rem;
    color: var(--text-mid);
    background: var(--panel-2);
    border-color: var(--line);
  }
</style>
