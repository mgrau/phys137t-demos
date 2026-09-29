<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let host: HTMLDivElement;
  let content: HTMLDivElement;
  let scale = $state(1);
  onMount(() => {
    const measure = () => {
      const available = host.clientHeight;
      scale = available > 0 ? Math.min(1, available / Math.max(1, content.offsetHeight), host.clientWidth / Math.max(1, content.scrollWidth)) : 1;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host); observer.observe(content); measure();
    return () => observer.disconnect();
  });
</script>
<div class="fit" bind:this={host}><div class="fit-content" bind:this={content} style:transform={`scale(${scale})`}>{@render children()}</div></div>
<style>
  .fit { flex: 1; min-height: 0; min-width: 0; position: relative; overflow: clip; }
  .fit-content { width: 100%; transform-origin: top center; }
</style>
