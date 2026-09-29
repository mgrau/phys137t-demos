<script lang="ts">
  import { Marked, Renderer } from 'marked';
  import { render } from 'misty-states/render';
  import DOMPurify from 'dompurify';
  import Figure from './Figure.svelte';
  let { text, shapes = 'os^' }: { text: string; shapes?: string } = $props();
  const id = $props.id();
  const blocks = $derived(text.split(/```misty\s*\n([\s\S]*?)```/g));
  function html(s: string, block: number) {
    const renderer = new Renderer();
    const plain = new Renderer();
    let inline = 0;
    renderer.codespan = token => {
      if (!token.text.startsWith('misty:')) return plain.codespan(token);
      const source = token.text.slice(6).trim();
      const names: Record<string, string> = { o: 'circle', s: 'square', '^': 'triangle', d: 'diamond' };
      const label = /^[01?]+$/.test(source)
        ? [...source].map((v,i) => `${v === '0' ? 'White' : v === '1' ? 'Black' : 'Unknown'} ${names[shapes[i]] ?? 'qubit'}`).join(', ')
        : 'Quantum state diagram';
      const drawing = render(`shape ${shapes}\n${source}`, { idPrefix: `inline-${id}-${block}-${inline++}`, background: false, check: false });
      return `<span class="inline-misty" role="img" aria-label="${label}">${drawing.svg}</span>`;
    };
    const markdown = new Marked({ renderer });
    return DOMPurify.sanitize(markdown.parse(s, { async: false }), { USE_PROFILES: { html: true, svg: true, svgFilters: true } });
  }
</script>
<div class="prose">
  {#each blocks as block, i}
    {#if i % 2}<Figure source={`shape ${shapes}\n${block.trim()}`} label="Worked quantum state or circuit" />
    {:else}{@html html(block, i)}{/if}
  {/each}
</div>
