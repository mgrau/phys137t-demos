<script lang="ts">
  /**
   * The Oracle as a box you put qubits into.
   *
   * The lecture draws it as a labelled gate in a circuit; here it is the object
   * itself, because the classical story is physical — you set the square to a
   * door, drop a white circle in, and see what comes out. A student who has
   * watched a circle go in white and come out black knows what "the oracle
   * flips the circle" means without being told.
   *
   * The travel is a CSS transition on a single element rather than keyframes,
   * so it can be interrupted and reversed without leaving a half-played
   * animation behind.
   */
  import Figure from './Figure.svelte';

  let {
    square,
    circleIn,
    circleOut,
    phase,
  }: {
    /** The door being asked about, as a misty qubit source. */
    square: '0' | '1';
    circleIn: '0' | '1';
    /** What comes back. Same as `circleIn` unless the oracle flipped it. */
    circleOut: '0' | '1';
    phase: 'idle' | 'entering' | 'inside' | 'leaving' | 'done';
  } = $props();

  const travelling = $derived(phase !== 'idle');
  const flipped = $derived(circleIn !== circleOut);
  /** Inside the box the circle is hidden, so the flip is never seen happening. */
  const shown = $derived(phase === 'leaving' || phase === 'done' ? circleOut : circleIn);
</script>

<div class="rig">
  <!-- The door selector, held against the box's left port. -->
  <div class="port square">
    <span class="tag">door</span>
    <Figure source={square} idPrefix="oracle-square" scale={0.66}
            shapeOrder={['square']} ariaLabel="The door being asked about" />
  </div>

  <div class="track">
    <div class="rail" aria-hidden="true"></div>

    <div class="box" class:busy={phase === 'inside'}>
      <span class="name">Tiger?</span>
    </div>

    <!-- The circle, travelling. `top` is a percentage of the rail. -->
    <div
      class="rider"
      class:hidden={phase === 'inside'}
      style:top={phase === 'idle' || phase === 'entering'
        ? '0%'
        : phase === 'inside'
          ? '50%'
          : '100%'}
      aria-hidden={!travelling}
    >
      <Figure source={shown} idPrefix="oracle-circle" scale={0.66}
              shapeOrder={['circle']} ariaLabel="The answer qubit" />
    </div>
  </div>

  <div class="caption" aria-live="polite">
    {#if phase === 'idle'}
      Send a white circle through.
    {:else if phase === 'entering' || phase === 'inside'}
      Asking…
    {:else if flipped}
      It came back <strong>black</strong>. A tiger is behind that door.
    {:else}
      It came back white. No tiger behind that door.
    {/if}
  </div>
</div>

<style>
  .rig {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 12px 10px;
    background: var(--paper);
    border: 1px solid var(--paper-edge);
    border-radius: var(--radius);
  }

  .port {
    display: grid;
    justify-items: center;
    gap: 2px;
  }
  .tag {
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--paper-dim);
  }

  .track {
    position: relative;
    width: 100%;
    max-width: 200px;
    height: 158px;
  }

  /* The wire the circle runs along. */
  .rail {
    position: absolute;
    left: 50%;
    top: 6px;
    bottom: 6px;
    width: 3px;
    margin-left: -1.5px;
    border-radius: 2px;
    background: var(--paper-edge);
  }

  .box {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    place-items: center;
    min-width: 118px;
    padding: 13px 16px;
    background: var(--panel-2);
    border: 2px solid var(--line-strong);
    border-radius: 9px;
    transition: border-color 0.2s, background 0.2s;
  }
  .box.busy {
    border-color: var(--spot);
    background: color-mix(in srgb, var(--spot) 12%, var(--panel-2));
  }
  .name {
    font-size: 1rem;
    font-weight: 650;
    color: var(--text);
  }

  .rider {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: top 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
  }
  /* Hidden while inside: the flip is the box's business, not something you
     watch happen. */
  .rider.hidden {
    opacity: 0;
  }

  .caption {
    max-width: 34ch;
    text-align: center;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--paper-dim);
  }

  @media (prefers-reduced-motion: reduce) {
    .rider,
    .box {
      transition: none;
    }
  }
</style>
