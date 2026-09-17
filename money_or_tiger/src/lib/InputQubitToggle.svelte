<script lang="ts">
  let { shape, value, x, y, onToggle }: {
    shape: 'square' | 'circle';
    value: string;
    x: number;
    y: number;
    onToggle: () => void;
  } = $props();
  const label = $derived(`Initial ${shape}: ${value === '0' ? 'white' : 'black'}. Click to change to ${value === '0' ? 'black' : 'white'}.`);
</script>

<!-- A native button over the library-rendered qubit supports mouse, touch,
     Enter, and Space without replacing Misty's artwork. -->
<button type="button" class="input-qubit-toggle" data-input-qubit={shape}
  style:left={`${x}px`} style:top={`${y}px`}
  aria-label={label} title={label} onclick={onToggle}></button>

<style>
  .input-qubit-toggle {
    position: absolute; z-index: 3; width: 40px; height: 40px;
    transform: translate(-50%, -50%); padding: 0; border: 0;
    border-radius: 7px; background: transparent; cursor: pointer;
    touch-action: manipulation;
  }
  .input-qubit-toggle:hover { background: #315b9c18; }
  .input-qubit-toggle:focus-visible { outline: 2px solid #315b9c; outline-offset: 1px; }
</style>
