<script lang="ts">
  /**
   * The two doors, labelled the way the lecture labels them: one with a white
   * square, one with a black square. The label on the door is the same square
   * that goes into the oracle, and that correspondence is the thing a student
   * has to hold on to, so it is drawn in the course's own notation rather than
   * written as a word.
   *
   * They swing rather than cut. One button opens *both* — which is the whole
   * reason you only care whether there is a tiger, not which door it is behind
   * — so opening is one gesture and both panels move together.
   */
  import Figure from './Figure.svelte';
  import type { Where } from './game';

  let { where, open }: { where: Where; open: boolean } = $props();

  const DOORS = [
    { id: 'white' as const, label: 'white', source: '0' },
    { id: 'black' as const, label: 'black', source: '1' },
  ];
</script>

<div class="doors">
  {#each DOORS as door, i}
    {@const tiger = where === door.id}
    <div class="frame" class:open>
      <!-- What is behind, revealed as the panel swings away. -->
      <div class="behind" class:tiger>
        <span class="what">{tiger ? '🐅' : '💰'}</span>
        <span class="cap">{tiger ? 'tiger' : 'money'}</span>
      </div>

      <!-- The door itself. Hinged on the outside edge so the pair opens
           outwards, like a cupboard. -->
      <div class="panel" class:right={i === 1}>
        <div class="plate">
          <Figure source={door.source} idPrefix={`door-${door.id}`} scale={0.7}
                  shapeOrder={['square']}
                  ariaLabel={`The door labelled with a ${door.label} square`} />
        </div>
        <span class="knob" aria-hidden="true"></span>
      </div>
    </div>
  {/each}
</div>

<p class="sr" aria-live="polite">
  {#if open}
    The white door has {where === 'white' ? 'a tiger' : 'money'}; the black door
    has {where === 'black' ? 'a tiger' : 'money'}.
  {:else}
    Both doors are closed.
  {/if}
</p>

<style>
  .doors {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    /* Depth, so the swing reads as a door rather than a squash. */
    perspective: 900px;
  }

  .frame {
    position: relative;
    min-height: 132px;
    border-radius: var(--radius);
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    overflow: hidden;
  }

  .behind {
    position: absolute;
    inset: 0;
    display: grid;
    gap: 2px;
    place-content: center;
    justify-items: center;
    background: var(--panel-3);
  }
  .behind.tiger {
    background: color-mix(in srgb, var(--bad) 16%, var(--panel-3));
  }
  .what {
    font-size: 2.3rem;
    line-height: 1;
  }
  .cap {
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .panel {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    background: var(--paper);
    border-right: 1px solid var(--paper-edge);
    transform-origin: left center;
    transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
    backface-visibility: hidden;
  }
  .panel.right {
    transform-origin: right center;
    border-right: 0;
    border-left: 1px solid var(--paper-edge);
  }
  .frame.open .panel {
    transform: rotateY(-105deg);
  }
  .frame.open .panel.right {
    transform: rotateY(105deg);
  }

  .plate {
    display: inline-flex;
    padding: 3px 6px;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: 5px;
  }

  /* A handle, so a closed panel reads as a door and not a card. */
  .knob {
    position: absolute;
    top: 50%;
    right: 9px;
    width: 7px;
    height: 7px;
    margin-top: -3px;
    border-radius: 50%;
    background: var(--paper-edge);
  }
  .panel.right .knob {
    right: auto;
    left: 9px;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .panel {
      transition: none;
    }
  }
</style>
