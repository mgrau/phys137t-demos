<script lang="ts">
  import { render } from 'misty-states/render';
  let { source, label, id, scale = 1 }: {
    source: string; label: string; id: string; scale?: number;
  } = $props();
  const svg = $derived(render(source, {
    idPrefix: `bell-${id}`, scale, dark: false, background: false, check: false,
  }).svg);
</script>

<div class="figure" role="img" aria-label={label}>{@html svg}</div>

<style>
  .figure { display: flex; justify-content: center; align-items: center; }
  .figure :global(svg) { display: block; max-width: 100%; height: auto; }
</style>
