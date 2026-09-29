<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import Figure from './Figure.svelte';
  let { text, shapes = 'os^' }: { text: string; shapes?: string } = $props();
  const blocks = $derived(text.split(/```misty\s*\n([\s\S]*?)```/g));
  const html = (s: string) => DOMPurify.sanitize(marked.parse(s, { async: false }), { USE_PROFILES: { html: true } });
</script>
<div class="prose">
  {#each blocks as block, i}
    {#if i % 2}<Figure source={`shape ${shapes}\n${block.trim()}`} label="Worked quantum state or circuit" />
    {:else}{@html html(block)}{/if}
  {/each}
</div>
