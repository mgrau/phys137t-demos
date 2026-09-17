<script lang="ts">
  import Figure from './Figure.svelte';
  import type { Where } from './game';

  let {
    where,
    open,
    onToggle,
  }: {
    where: Where;
    open: boolean;
    onToggle: () => void;
  } = $props();

  const DOORS = [
    { id: 'white' as const, name: 'White door', source: '0' },
    { id: 'black' as const, name: 'Black door', source: '1' },
  ];
</script>

<div class="doors-stage">
  {#each DOORS as door, index}
    {@const tiger = where === door.id}
    <figure class="door-unit">
      <div class="door-frame" class:open>
        <div class="behind" class:tiger aria-hidden={!open}>
          <span class="prize" aria-hidden="true">{tiger ? '🐅' : '💰'}</span>
          <strong>{tiger ? 'TIGER' : 'MONEY'}</strong>
          <small>{tiger ? 'Do not open!' : 'You win!'}</small>
        </div>
        <div class="door-panel" class:right={index === 1}>
          <span class="panel-inset top"></span>
          <span class="panel-inset bottom"></span>
          <span class="hinge hinge-top" aria-hidden="true"></span>
          <span class="hinge hinge-bottom" aria-hidden="true"></span>
          <div class="door-plate">
            <Figure
              source={door.source}
              idPrefix={`door-${door.id}`}
              scale={0.68}
              shapeOrder={['square']}
              ariaLabel={`A ${door.id} square`}
            />
          </div>
          <span class="knob" aria-hidden="true"></span>
        </div>
      </div>
      <figcaption>{door.name}</figcaption>
    </figure>

    {#if index === 0}
      <div class="button-console">
        <span class="console-label">BOTH DOORS</span>
        <button
          class="show-button"
          class:pressed={open}
          aria-pressed={open}
          aria-label={open ? 'Close both doors' : 'Open both doors'}
          onclick={onToggle}
        >
          <span class="button-face" aria-hidden="true"></span>
        </button>
        <strong>{open ? 'CLOSE' : 'OPEN'}</strong>
        <small>press once</small>
      </div>
    {/if}
  {/each}
</div>

<p class="sr-only" aria-live="polite">
  {#if open}
    The white door has {where === 'white' ? 'a tiger' : 'money'};
    the black door has {where === 'black' ? 'a tiger' : 'money'}.
  {:else}
    Both doors are closed.
  {/if}
</p>

<style>
  .doors-stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 82px minmax(0, 1fr);
    align-items: end;
    gap: 10px;
    padding: 14px 6px 4px;
    perspective: 1100px;
  }

  .door-unit {
    min-width: 0;
    margin: 0;
  }

  .door-frame {
    position: relative;
    aspect-ratio: 0.67;
    min-height: 238px;
    max-height: 330px;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--panel-3) 76%, transparent), transparent 60%),
      var(--surface);
    border: 7px solid color-mix(in srgb, var(--text) 72%, #6f5339);
    border-bottom-width: 10px;
    border-radius: 5px 5px 2px 2px;
    box-shadow:
      inset 0 0 0 2px color-mix(in srgb, var(--line-strong) 72%, transparent),
      0 10px 24px color-mix(in srgb, var(--text) 13%, transparent);
    transform-style: preserve-3d;
  }

  .behind {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 4px;
    background:
      radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--good) 22%, transparent), transparent 55%),
      repeating-linear-gradient(0deg, transparent 0 19px, color-mix(in srgb, var(--line) 45%, transparent) 20px),
      var(--panel);
    text-align: center;
  }

  .behind.tiger {
    background:
      radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--bad) 26%, transparent), transparent 58%),
      repeating-linear-gradient(0deg, transparent 0 19px, color-mix(in srgb, var(--line) 45%, transparent) 20px),
      var(--panel);
  }

  .prize {
    font-size: clamp(2.5rem, 5vw, 4.2rem);
    line-height: 1;
    filter: drop-shadow(0 4px 7px color-mix(in srgb, var(--text) 18%, transparent));
  }

  .behind strong {
    font-size: 0.86rem;
    letter-spacing: 0.18em;
  }

  .behind small {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  .door-panel {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.08), transparent 18%, rgba(0,0,0,0.12) 86%),
      linear-gradient(135deg, #9a6237, #72401f 55%, #4e2c1c);
    border: 2px solid #3d2417;
    transform-origin: left center;
    transform-style: preserve-3d;
    transition: transform 800ms cubic-bezier(0.22, 0.72, 0.18, 1);
    backface-visibility: hidden;
  }

  .door-panel.right {
    transform-origin: right center;
  }

  .open .door-panel {
    transform: rotateY(-106deg);
  }

  .open .door-panel.right {
    transform: rotateY(106deg);
  }

  .panel-inset {
    position: absolute;
    left: 12%;
    right: 12%;
    border: 3px ridge rgba(47, 24, 11, 0.55);
    background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.1));
    box-shadow: inset 0 0 0 5px rgba(108, 60, 27, 0.22);
  }

  .panel-inset.top {
    top: 7%;
    height: 36%;
  }

  .panel-inset.bottom {
    bottom: 7%;
    height: 35%;
  }

  .door-plate {
    position: absolute;
    left: 50%;
    top: 25%;
    z-index: 2;
    display: grid;
    place-items: center;
    min-width: 48px;
    min-height: 48px;
    padding: 5px;
    transform: translate(-50%, -50%);
    background: var(--paper);
    border: 2px solid #d1a856;
    border-radius: 7px;
    box-shadow: 0 3px 9px rgba(45, 24, 9, 0.34);
  }

  .knob {
    position: absolute;
    z-index: 3;
    top: 51%;
    right: 9%;
    width: 13px;
    height: 13px;
    border: 2px solid #6d4915;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #f5d373, #b5791d 62%, #6f4610);
    box-shadow: 0 2px 5px rgba(0,0,0,0.35);
  }

  .right .knob {
    right: auto;
    left: 9%;
  }

  .hinge {
    position: absolute;
    z-index: 3;
    left: 2px;
    width: 6px;
    height: 24px;
    border-radius: 2px;
    background: linear-gradient(90deg, #75501c, #e1b75c, #79511b);
  }

  .right .hinge {
    right: 2px;
    left: auto;
  }

  .hinge-top { top: 15%; }
  .hinge-bottom { bottom: 15%; }

  figcaption {
    margin-top: 7px;
    color: var(--text-mid);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-align: center;
    text-transform: uppercase;
  }

  .button-console {
    align-self: center;
    display: grid;
    justify-items: center;
    gap: 5px;
    margin-bottom: 10px;
    padding: 12px 7px 10px;
    background: linear-gradient(145deg, var(--panel-2), var(--panel-3));
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--text) 11%, transparent);
  }

  .console-label,
  .button-console small {
    color: var(--text-faint);
    font-size: 0.58rem;
    letter-spacing: 0.09em;
    text-align: center;
    text-transform: uppercase;
  }

  .button-console strong {
    color: var(--text-mid);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
  }

  .show-button {
    position: relative;
    width: 58px;
    height: 58px;
    padding: 0;
    cursor: pointer;
    background: linear-gradient(#6d7786, #343b46);
    border: 1px solid #262c34;
    border-radius: 50%;
    box-shadow: 0 5px 0 #242a31, 0 7px 12px rgba(0,0,0,0.28);
  }

  .button-face {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    background: radial-gradient(circle at 36% 26%, #ff8a72, #d23824 52%, #8f1a12 75%);
    border: 2px solid #79180f;
    box-shadow: inset 0 4px 7px rgba(255,255,255,0.27), inset 0 -5px 7px rgba(74,0,0,0.35);
  }

  .show-button:active,
  .show-button.pressed {
    transform: translateY(3px);
    box-shadow: 0 2px 0 #242a31, 0 4px 7px rgba(0,0,0,0.24);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .doors-stage {
      grid-template-columns: minmax(0, 1fr) 62px minmax(0, 1fr);
      gap: 5px;
      padding-inline: 0;
    }

    .door-frame {
      min-height: 205px;
      border-width: 5px;
      border-bottom-width: 8px;
    }

    .button-console {
      padding-inline: 4px;
    }

    .show-button {
      width: 48px;
      height: 48px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .door-panel { transition: none; }
  }
</style>
